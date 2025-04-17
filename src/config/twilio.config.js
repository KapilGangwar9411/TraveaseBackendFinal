const twilio = require('twilio');
require('dotenv').config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

module.exports = {
  client,
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER
};