const nodemailer = require('nodemailer');
require('dotenv').config();

async function testRealNodemailer() {
  console.log('📧 Testing real Nodemailer SMTP dispatch...');
  console.log('  -> SYSTEM_EMAIL:', process.env.SYSTEM_EMAIL);
  console.log('  -> SYSTEM_EMAIL_PASSWORD length:', process.env.SYSTEM_EMAIL_PASSWORD?.length);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SYSTEM_EMAIL,
      pass: process.env.SYSTEM_EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: `"RentEase Verification" <${process.env.SYSTEM_EMAIL}>`,
    to: process.env.SYSTEM_EMAIL,
    subject: '🔑 RentEase Security Test OTP Code',
    text: 'Your test 5-digit OTP code is 12345.',
    html: '<h2>RentEase Test OTP Code: <strong>12345</strong></h2>',
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Real Nodemailer Email Sent Successfully!');
    console.log('  -> Message ID:', info.messageId);
    console.log('  -> Response:', info.response);
  } catch (err) {
    console.error('❌ Nodemailer Error:', err);
  }
}

testRealNodemailer();
