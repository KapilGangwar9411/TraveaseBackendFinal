const twilio = require('twilio');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Initialize Twilio client conditionally
let client;
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio client initialized successfully');
  } else {
    console.log('⚠️ Twilio credentials not found in environment variables:');
    console.log(`  TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? 'Found' : 'Missing'}`);
    console.log(`  TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? 'Found' : 'Missing'}`);
    console.log('⚠️ SMS functionality will be disabled. OTPs will be returned in the API response for development.');
  }
} catch (error) {
  console.error('❌ Failed to initialize Twilio client:', error);
  console.log('⚠️ Error details:', JSON.stringify(error, null, 2));
  console.log('⚠️ SMS functionality will be disabled');
}

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, phoneNumber: user.phoneNumber },
    process.env.JWT_SECRET || 'default_jwt_secret_for_development',
    { expiresIn: '30d' }
  );
};

// Format phone number to E.164 format
const formatPhoneNumber = (phoneNumber) => {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');

  // If the number doesn't start with a country code, add +91 for India
  if (!digits.startsWith('91')) {
    return `+91${digits}`;
  }

  return `+${digits}`;
};

// Send OTP
const sendOTP = async (req, res) => {
  console.log('📱 Sending OTP - Request Body:', req.body);

  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    console.log('❌ Phone number missing in request');
    return res.status(400).json({
      success: false,
      message: 'Phone number is required'
    });
  }

  try {
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
    console.log(`📞 Formatted phone number: ${formattedPhoneNumber}`);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`🔑 Generated OTP: ${otp}`);

    // Set OTP expiration time (10 minutes from now)
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    console.log(`⏱️ OTP expires at: ${otpExpires.toISOString()}`);

    // Save OTP in database
    await User.createOrUpdate({
      phoneNumber: formattedPhoneNumber,
      otp,
      otpExpires
    });
    console.log('💾 OTP saved to database');

    // Send OTP via SMS if Twilio is configured
    if (client && process.env.TWILIO_PHONE_NUMBER) {
      try {
        await client.messages.create({
          body: `Your Travease verification code is: ${otp}. Valid for 10 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedPhoneNumber
        });
        console.log('✅ SMS sent successfully');

        return res.status(200).json({
          success: true,
          message: 'OTP sent successfully'
        });
      } catch (smsError) {
        console.error('❌ Failed to send SMS:', smsError);

        // In production, you might want to return an error here,
        // but for development, we'll proceed and return the OTP
        if (process.env.NODE_ENV === 'production') {
          return res.status(500).json({
            success: false,
            message: 'Failed to send OTP via SMS'
          });
        }
      }
    }

    // If Twilio is not configured or SMS sending failed in development
    console.log('⚠️ Returning OTP in response (development mode only)');
    return res.status(200).json({
      success: true,
      message: 'OTP generated successfully',
      development: {
        otp,
        expiresAt: otpExpires
      }
    });

  } catch (error) {
    console.error('❌ Error in sendOTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate and send OTP',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

// Export the sendOTP function
exports.sendOTP = sendOTP;

/**
 * Verify OTP
 * @param {Request} req
 * @param {Response} res
 */
exports.verifyOTP = async (req, res) => {
  console.log('⭐ Verify OTP Request Body:', JSON.stringify(req.body, null, 2));

  try {
    const { phoneNumber, otp } = req.body;

    // Input validation
    if (!phoneNumber) {
      console.log('❌ Missing phone number');
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    console.log(`📱 Phone number received: ${phoneNumber}`);

    // Validate OTP format and type
    console.log(`🔢 OTP received: ${otp}, type: ${typeof otp}`);

    if (!otp) {
      console.log('❌ Missing OTP');
      return res.status(400).json({ success: false, message: 'OTP is required' });
    }

    // Ensure OTP is a 6-digit number
    const otpRegex = /^\d{6}$/;
    const cleanOtp = String(otp).trim();

    if (!otpRegex.test(cleanOtp)) {
      console.log(`❌ Invalid OTP format: ${cleanOtp}`);
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 6-digit OTP',
        debug: {
          providedOtp: otp,
          cleanOtp,
          isValid: otpRegex.test(cleanOtp)
        }
      });
    }

    // Format phone number (same as in sendOTP)
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
    console.log(`📞 Formatted phone number: ${formattedPhoneNumber}`);

    // Find user by phone number
    console.log(`🔍 Finding user with phone number: ${formattedPhoneNumber}`);
    const user = await User.findByPhoneNumber(formattedPhoneNumber);

    if (!user) {
      console.log(`❌ No user found with phone number: ${formattedPhoneNumber}`);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log(`✅ User found: ${user.id}`);

    // Check if OTP exists and hasn't expired
    if (!user.otp) {
      console.log('❌ No OTP found for user');
      return res.status(400).json({ success: false, message: 'No OTP found. Please request a new OTP' });
    }

    // Log OTP details for debugging
    console.log(`📊 OTP Debug Info:
      - Stored OTP: ${user.otp} (${typeof user.otp})
      - Provided OTP: ${cleanOtp} (${typeof cleanOtp})
      - OTP Expiry: ${user.otpExpires}
      - Current Time: ${new Date()}
      - Is Expired: ${user.otpExpires < new Date()}
    `);

    if (user.otpExpires && user.otpExpires < new Date()) {
      console.log('❌ OTP has expired');
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new OTP' });
    }

    // Compare OTPs (ensuring both are strings)
    const storedOtp = String(user.otp).trim();
    const isOtpValid = storedOtp === cleanOtp;

    console.log(`🔐 OTP comparison: ${storedOtp} === ${cleanOtp} => ${isOtpValid}`);

    if (!isOtpValid) {
      console.log('❌ Invalid OTP');
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again' });
    }

    // Clear OTP
    await User.clearOTP(formattedPhoneNumber);
    console.log('✅ OTP cleared after successful verification');

    // Generate token
    const token = jwt.sign(
      { id: user.id, phoneNumber: formattedPhoneNumber },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '7d' }
    );

    console.log('🔑 JWT token generated successfully');

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      token
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
