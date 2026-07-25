const nodemailer = require('nodemailer');

// Initialize Nodemailer Transport
const createTransporter = () => {
  const user = process.env.SYSTEM_EMAIL;
  const pass = process.env.SYSTEM_EMAIL_PASSWORD;

  if (!user || !pass || pass === 'your_app_password') {
    return null; // Signals fallback mode
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  });
};

/**
 * Send 5-digit verification OTP email
 */
const sendOtpEmail = async (toEmail, otpCode) => {
  const transporter = createTransporter();

  console.log(`\n======================================================`);
  console.log(`🔑 [OTP GENERATED] To: ${toEmail} | CODE: ${otpCode}`);
  console.log(`======================================================\n`);

  if (!transporter) {
    console.log(`ℹ️ Nodemailer: System email credentials not set. OTP logged to console above.`);
    return { success: true, mode: 'console' };
  }

  const mailOptions = {
    from: `"RentEase Verification" <${process.env.SYSTEM_EMAIL}>`,
    to: toEmail,
    subject: '🔑 RentEase Security OTP Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #4f46e5; padding: 24px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px;">🏠 RentEase Verification</h1>
        </div>
        <div style="padding: 32px; color: #1e293b;">
          <h2 style="margin-top: 0; color: #0f172a;">Verify Your Account</h2>
          <p style="font-size: 15px; color: #475569;">Please use the 5-digit OTP code below to complete your registration:</p>
          <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #4f46e5;">${otpCode}</span>
          </div>
          <p style="font-size: 13px; color: #64748b;">This verification code is valid for 10 minutes. If you did not request this code, please ignore this email.</p>
        </div>
        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
          © ${new Date().getFullYear()} RentEase Platform. All rights reserved.
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ [Nodemailer] OTP email successfully sent to ${toEmail}`);
    return { success: true, mode: 'smtp' };
  } catch (err) {
    console.error(`⚠️ [Nodemailer Error] Could not dispatch email via SMTP: ${err.message}`);
    console.log(`ℹ️ [Fallback] You can use OTP: ${otpCode} displayed in console above.`);
    return { success: true, mode: 'fallback_console', error: err.message };
  }
};

/**
 * Send tailored HTML Welcome Email after successful OTP verification
 */
const sendWelcomeEmail = async (toEmail, name, role) => {
  const transporter = createTransporter();

  const isLandlord = role === 'landlord';
  const roleTitle = isLandlord ? 'Landlord / Property Owner' : 'Tenant / User';

  console.log(`✉️ [WELCOME EMAIL] Dispatching welcome notification to ${name} (${toEmail}) as ${roleTitle}`);

  if (!transporter) {
    console.log(`ℹ️ Nodemailer: Welcome email logged to console.`);
    return { success: true, mode: 'console' };
  }

  const tenantContent = `
    <h2 style="color: #0f172a; margin-top: 0;">Welcome to RentEase, ${name}! 🎉</h2>
    <p style="font-size: 15px; color: #475569; line-height: 1.6;">
      Your account is now verified! You can now explore rental listings, schedule viewings, submit maintenance complaints, and connect directly with verified property landlords.
    </p>
    <div style="background-color: #e0e7ff; border-left: 4px solid #4f46e5; padding: 16px; border-radius: 4px; margin: 20px 0;">
      <h4 style="margin: 0 0 8px 0; color: #3730a3;">💡 Next Steps:</h4>
      <ul style="margin: 0; padding-left: 20px; color: #3730a3;">
        <li>Browse verified properties in your desired neighborhood</li>
        <li>Submit complaints & dispute tickets effortlessly</li>
        <li>Manage your active lease applications</li>
      </ul>
    </div>
  `;

  const landlordContent = `
    <h2 style="color: #0f172a; margin-top: 0;">Welcome aboard, ${name}! 🏠</h2>
    <p style="font-size: 15px; color: #475569; line-height: 1.6;">
      Thank you for joining RentEase as a Landlord! Your account request has been submitted for admin verification.
    </p>
    <div style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 16px; border-radius: 4px; margin: 20px 0;">
      <h4 style="margin: 0 0 8px 0; color: #92400e;">⚡ Landlord Features:</h4>
      <ul style="margin: 0; padding-left: 20px; color: #92400e;">
        <li>Create and publish rental property listings</li>
        <li>Manage property availability with our interactive visual calendar</li>
        <li>Review tenant inquiries and manage lease applications</li>
      </ul>
    </div>
  `;

  const mailOptions = {
    from: `"RentEase Team" <${process.env.SYSTEM_EMAIL}>`,
    to: toEmail,
    subject: isLandlord ? '🏠 Welcome to RentEase for Landlords!' : '🎉 Welcome to RentEase!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: ${isLandlord ? '#0d9488' : '#4f46e5'}; padding: 24px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px;">🏠 RentEase Platform</h1>
        </div>
        <div style="padding: 32px;">
          ${isLandlord ? landlordContent : tenantContent}
          <div style="text-align: center; margin-top: 32px;">
            <a href="http://localhost:5173" style="background-color: ${isLandlord ? '#0d9488' : '#4f46e5'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to RentEase Dashboard</a>
          </div>
        </div>
        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
          © ${new Date().getFullYear()} RentEase Platform. All rights reserved.
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ [Nodemailer] Welcome email sent to ${toEmail}`);
    return { success: true, mode: 'smtp' };
  } catch (err) {
    console.error(`⚠️ [Nodemailer Error] Welcome email failed: ${err.message}`);
    return { success: false, error: err.message };
  }
};

module.exports = {
  sendOtpEmail,
  sendWelcomeEmail,
};
