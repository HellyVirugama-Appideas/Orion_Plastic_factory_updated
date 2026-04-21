const twilioConfig = require('../config/twilio');

// Send SMS
exports.sendSMS = async (to, message) => {
  try {
    const result = await twilioConfig.client.messages.create({
      body: message,
      from: twilioConfig.phoneNumber,
      to: to
    });
    
    return {
      success: true,
      messageId: result.sid
    };
  } catch (error) {
    console.error('SMS Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Send OTP
exports.sendOTP = async (phone, otp) => {
  const message = `Your OTP is: ${otp}. Valid for 10 minutes. Do not share with anyone.`;
  return await this.sendSMS(phone, message);
};

// Send PIN Reset Link
exports.sendPinResetSMS = async (phone, resetToken) => {
  const message = `Reset your PIN using this code: ${resetToken}. Valid for 1 hour.`;
  return await this.sendSMS(phone, message);
};