const twilio = require('twilio');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Initialize Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, phoneNumber: user.phoneNumber },
    process.env.JWT_SECRET,
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
exports.sendOTP = async (req, res) => {
  console.log('⭐ Send OTP Request Body:', JSON.stringify(req.body, null, 2));

  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      console.log('❌ Missing phone number');
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    // Format the phone number
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
    console.log(`📱 Sending OTP to: ${formattedPhoneNumber}`);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 300000); // 5 minutes from now

    console.log(`🔢 Generated OTP: ${otp}`);
    console.log(`⏱️ OTP expires at: ${otpExpires}`);

    // Store OTP in database
    const user = await User.createOrUpdate(formattedPhoneNumber, {
      otp,
      otpExpires
    });

    console.log(`✅ User data stored/updated with ID: ${user.id}`);

    // Send OTP via SMS if Twilio credentials are available
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      try {
        await client.messages.create({
          body: `Your Travease verification code is: ${otp}`,
          to: formattedPhoneNumber,
          from: process.env.TWILIO_PHONE_NUMBER
        });
        console.log('📨 SMS sent successfully via Twilio');
      } catch (twilioError) {
        console.error('⚠️ Twilio SMS error:', twilioError);
        // Continue even if SMS fails - useful for testing
        console.log('⚠️ Continuing despite SMS failure (for testing)');
      }
    } else {
      console.log('⚠️ Twilio credentials not configured. Skipping SMS sending.');
      console.log('💡 For testing, use OTP:', otp);
    }

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      devNote: process.env.NODE_ENV === 'development' ? `Test OTP: ${otp}` : undefined
    });
  } catch (error) {
    console.error('❌ Error sending OTP:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

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
