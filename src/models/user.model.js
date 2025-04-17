const { db } = require('../config/firebase');

class User {
  /**
   * Find a user by phone number
   * @param {string} phoneNumber
   * @returns {Promise<Object|null>} User object or null if not found
   */
  static async findByPhoneNumber(phoneNumber) {
    try {
      const querySnapshot = await db.collection('users')
        .where('phoneNumber', '==', phoneNumber)
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        console.log(`No user found with phone number: ${phoneNumber}`);
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();

      // Ensure OTP is stored as a string
      if (data.otp !== undefined) {
        data.otp = String(data.otp);
      }

      // Convert Firestore Timestamp to JavaScript Date if it exists
      if (data.otpExpires && typeof data.otpExpires.toDate === 'function') {
        data.otpExpires = data.otpExpires.toDate();
      }

      console.log(`Found user with ID: ${doc.id}`);
      console.log(`User data: ${JSON.stringify({
        id: doc.id,
        phoneNumber: data.phoneNumber,
        otp: data.otp ? '******' : null,  // Masking OTP for security
        otpExpires: data.otpExpires
      }, null, 2)}`);

      return {
        id: doc.id,
        ...data
      };
    } catch (error) {
      console.error('Error finding user by phone number:', error);
      throw new Error('Database error while finding user');
    }
  }

  /**
   * Create or update a user
   * @param {string} phoneNumber
   * @param {Object} userData
   * @returns {Promise<Object>} Created or updated user
   */
  static async createOrUpdate(phoneNumber, userData = {}) {
    try {
      // Ensure OTP is a string if it exists
      if (userData.otp !== undefined) {
        userData.otp = String(userData.otp);
        console.log(`Formatted OTP to string: ${userData.otp}`);
      }

      const querySnapshot = await db.collection('users')
        .where('phoneNumber', '==', phoneNumber)
        .limit(1)
        .get();

      let userId;

      if (querySnapshot.empty) {
        // Create new user
        console.log(`Creating new user with phone number: ${phoneNumber}`);
        const newUser = {
          phoneNumber,
          createdAt: new Date(),
          ...userData
        };

        const docRef = await db.collection('users').add(newUser);
        userId = docRef.id;
        console.log(`Created new user with ID: ${userId}`);
      } else {
        // Update existing user
        const doc = querySnapshot.docs[0];
        userId = doc.id;

        console.log(`Updating existing user with ID: ${userId}`);
        await db.collection('users').doc(userId).update({
          ...userData,
          updatedAt: new Date()
        });
      }

      return {
        id: userId,
        phoneNumber,
        ...userData
      };
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw new Error('Database error while creating/updating user');
    }
  }

  /**
   * Clear OTP for a user
   * @param {string} phoneNumber
   * @returns {Promise<void>}
   */
  static async clearOTP(phoneNumber) {
    try {
      const querySnapshot = await db.collection('users')
        .where('phoneNumber', '==', phoneNumber)
        .limit(1)
        .get();

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        console.log(`Clearing OTP for user with ID: ${doc.id}`);

        await db.collection('users').doc(doc.id).update({
          otp: null,
          otpExpires: null
        });

        console.log('OTP cleared successfully');
      } else {
        console.log(`No user found with phone number: ${phoneNumber} to clear OTP`);
      }
    } catch (error) {
      console.error('Error clearing OTP:', error);
      throw new Error('Database error while clearing OTP');
    }
  }
}

module.exports = User;
