const nodemailer = require('nodemailer');
require('dotenv').config();

async function testGmailPort() {
  console.log('📧 Testing explicit Gmail port 465 SSL...');
  const user = process.env.SYSTEM_EMAIL;
  const pass = process.env.SYSTEM_EMAIL_PASSWORD;

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  });

  try {
    const info = await transporter.sendMail({
      from: `"RentEase Platform" <${user}>`,
      to: user,
      subject: '🔑 RentEase Security Test Email',
      html: '<h2>Your 5-Digit OTP Code is: <strong>12345</strong></h2>',
    });
    console.log('✅ Real Nodemailer Email Sent Successfully via Port 465!');
    console.log('  -> Message ID:', info.messageId);
    console.log('  -> Response:', info.response);
  } catch (err) {
    console.error('❌ Port 465 Error:', err.message);
  }

  process.exit(0);
}

testGmailPort();
