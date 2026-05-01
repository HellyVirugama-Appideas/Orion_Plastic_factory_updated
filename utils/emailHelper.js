// const nodemailer = require('nodemailer');

// // Create transporter
// const transporter = nodemailer.createTransport({
//   service: process.env.EMAIL_SERVICE || 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASSWORD
//   }
// });

// // Send Email
// exports.sendEmail = async (to, subject, html) => {
//   try {
//     const mailOptions = {
//       from: `"${process.env.APP_NAME}" <${process.env.EMAIL_USER}>`,
//       to,
//       subject,
//       html
//     };

//     const info = await transporter.sendMail(mailOptions);

//     return {
//       success: true,
//       messageId: info.messageId
//     };
//   } catch (error) {
//     console.error('Email Error:', error);
//     return {
//       success: false,
//       error: error.message
//     };
//   }
// };

// // Send Welcome Email
// exports.sendWelcomeEmail = async (to, name) => {
//   const html = `
//     <h1>Welcome ${name}!</h1>
//     <p>Thank you for registering with us.</p>
//     <p>Your account has been created successfully.</p>
//   `;

//   return await this.sendEmail(to, 'Welcome to Our Platform', html);
// };

// // Send Password Reset Email
// exports.sendPasswordResetEmail = async (to, resetToken) => {
//   const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

//   const html = `
//     <h2>Password Reset Request</h2>
//     <p>Click the link below to reset your password:</p>
//     <a href="${resetUrl}">${resetUrl}</a>
//     <p>This link expires in 1 hour.</p>
//     <p>If you didn't request this, please ignore this email.</p>
//   `;

//   return await this.sendEmail(to, 'Password Reset Request', html);

// };

// // ── Send OTP Email (for driver email verification) ──
// exports.sendOTPEmail = async (to, otp, driverName) => {
//   const appName = process.env.APP_NAME || 'Orion';
//   const html = `
//     <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
//       <div style="background:linear-gradient(135deg,#1a237e,#3949ab);padding:24px;text-align:center;">
//         <h2 style="color:white;margin:0;">${appName}</h2>
//         <p style="color:#c5cae9;margin:6px 0 0;">Email Verification</p>
//       </div>
//       <div style="padding:28px;text-align:center;">
//         <p style="font-size:15px;color:#333;">Hello <strong>${driverName || 'Driver'}</strong>,</p>
//         <p style="color:#555;margin-bottom:20px;">Use the OTP below to verify your email address.</p>
//         <div style="background:#f5f5f5;border-radius:8px;padding:20px;display:inline-block;margin:0 auto;">
//           <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#1a237e;">${otp}</span>
//         </div>
//         <p style="color:#e53935;font-size:13px;margin-top:20px;">⏱ This OTP expires in <strong>10 minutes</strong></p>
//         <p style="color:#aaa;font-size:12px;">If you did not request this, please ignore this email.</p>
//       </div>
//       <div style="background:#f5f5f5;padding:12px;text-align:center;font-size:12px;color:#999;">
//         ${appName} | Automated email — do not reply
//       </div>
//     </div>`;

//   return await exports.sendEmail(to, `${appName} — Your OTP Code: ${otp}`, html);
// };


const nodemailer = require('nodemailer');

// Create transporter with proper Gmail config
const transporter = nodemailer.createTransport({
  // service: 'gmail',                    // Simple & reliable for Gmail
  // Agar service: 'gmail' nahi kaam kare to yeh use karo:
  // host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  // port: process.env.EMAIL_PORT || 587,
  // secure: process.env.EMAIL_SECURE === 'true',   // false for 587

  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  pool: true,                 // 🔥 important
  maxConnections: 5,
  maxMessages: 100,
  connectionTimeout: 10000,   // 🔥 10 sec
  greetingTimeout: 5000,
  socketTimeout: 10000,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD   // Yeh App Password hona chahiye (not normal password)
  },

  // ← Yeh line important hai certificate error ke liye
  tls: {
    rejectUnauthorized: false        // Development ke liye (Production mein remove kar dena)
  }
});

// Send Email (Base function)
exports.sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: `"${process.env.APP_NAME || 'Orion'}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent successfully → Message ID:', info.messageId);
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Email Sending Failed:', error.message);
    if (error.code === 'ESOCKET' || error.code === 'ETIMEDOUT') {
      console.error('Hint: Check your EMAIL_PASSWORD (use Gmail App Password) and internet.');
    }
    return {
      success: false,
      error: error.message
    };
  }
};

// Send OTP Email (for driver signup)
exports.sendOTPEmail = async (to, otp, driverName = 'Driver') => {
  const appName = process.env.APP_NAME || 'Orion';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#1a237e,#3949ab);padding:24px;text-align:center;">
        <h2 style="color:white;margin:0;">${appName}</h2>
        <p style="color:#c5cae9;margin:6px 0 0;">Email Verification</p>
      </div>
      <div style="padding:28px;text-align:center;">
        <p style="font-size:15px;color:#333;">Hello <strong>${driverName}</strong>,</p>
        <p style="color:#555;margin-bottom:20px;">Use the OTP below to verify your email address.</p>
        <div style="background:#f5f5f5;border-radius:8px;padding:20px;display:inline-block;margin:0 auto;">
          <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#1a237e;">${otp}</span>
        </div>
        <p style="color:#e53935;font-size:13px;margin-top:20px;">⏱ This OTP expires in <strong>10 minutes</strong></p>
        <p style="color:#aaa;font-size:12px;">If you did not request this, please ignore this email.</p>
      </div>
      <div style="background:#f5f5f5;padding:12px;text-align:center;font-size:12px;color:#999;">
        ${appName} | Automated email — do not reply
      </div>
    </div>`;

  return await exports.sendEmail(to, `${appName} — Your OTP Code: ${otp}`, html);
};

// Welcome Email
exports.sendWelcomeEmail = async (to, name) => {
  const html = `
    <h1>Welcome ${name}!</h1>
    <p>Thank you for registering with us.</p>
    <p>Your account has been created successfully.</p>
  `;
  return await exports.sendEmail(to, 'Welcome to Orion', html);
};

// Password Reset Email
exports.sendPasswordResetEmail = async (to, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const html = `
    <h2>Password Reset Request</h2>
    <p>Click the link below to reset your password:</p>
    <a href="${resetUrl}">${resetUrl}</a>
    <p>This link expires in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  return await exports.sendEmail(to, 'Password Reset Request', html);
};

module.exports = {
  sendEmail: exports.sendEmail,
  sendOTPEmail: exports.sendOTPEmail,
  sendWelcomeEmail: exports.sendWelcomeEmail,
  sendPasswordResetEmail: exports.sendPasswordResetEmail
};