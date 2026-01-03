const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Send activation email
exports.sendActivationEmail = async (email, token) => {
  const transporter = createTransporter();
  
  const activationUrl = `${process.env.CLIENT_URL}/activate/${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Activate Your Student Advising Account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Student Advising System</h1>
          </div>
          <div class="content">
            <h2>Activate Your Account</h2>
            <p>Thank you for registering! Please click the button below to activate your account:</p>
            <div style="text-align: center;">
              <a href="${activationUrl}" class="button">Activate Account</a>
            </div>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all;">${activationUrl}</p>
            <p><strong>Note:</strong> This link will expire in 24 hours.</p>
          </div>
          <div class="footer">
            <p>If you didn't create an account, please ignore this email.</p>
            <p>&copy; 2025 Student Advising System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Activation email sent to:', email);
  } catch (error) {
    console.error('Error sending activation email:', error);
    throw new Error('Failed to send activation email');
  }
};

// Send welcome email after activation
exports.sendWelcomeEmail = async (email, firstName) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Welcome to Student Advising System',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome ${firstName}!</h1>
          </div>
          <div class="content">
            <h2>Your Account is Active</h2>
            <p>Congratulations! Your account has been successfully activated.</p>
            <p>You can now log in and start using the Student Advising System.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
};

// Send verification code email
exports.sendVerificationCode = async (email, code, firstName) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Your Verification Code - Student Advising Portal',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .code-box { 
            background-color: #fff; 
            border: 2px solid #4CAF50; 
            border-radius: 10px; 
            padding: 20px; 
            text-align: center; 
            margin: 20px 0;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 5px;
            color: #4CAF50;
          }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Two-Factor Authentication</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName || 'User'}!</h2>
            <p>You've requested to log in to your Student Advising Portal account. Please use the verification code below to proceed:</p>
            <div class="code-box">
              ${code}
            </div>
            <p><strong>Important:</strong></p>
            <ul>
              <li>This code will expire in 10 minutes</li>
              <li>Never share this code with anyone</li>
              <li>If you didn't request this code, please ignore this email</li>
            </ul>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply.</p>
            <p>&copy; 2026 Student Advising System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Verification code sent to:', email);
  } catch (error) {
    console.error('Error sending verification code:', error);
    throw new Error('Failed to send verification code');
  }
};

// Send password reset email
exports.sendPasswordResetEmail = async (email, token, firstName) => {
  const transporter = createTransporter();

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Password Reset Request - Student Advising Portal',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { 
            display: inline-block; 
            padding: 12px 30px; 
            background-color: #4CAF50; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
          }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName || 'User'}!</h2>
            <p>You have requested to reset your password for your Student Advising Portal account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all;">${resetUrl}</p>
            <p><strong>Important:</strong></p>
            <ul>
              <li>This link will expire in 30 minutes</li>
              <li>If you didn't request this, please ignore this email</li>
              <li>Your password will not change unless you click the link and set a new one</li>
            </ul>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply.</p>
            <p>&copy; 2026 Student Advising System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Password reset email sent to:', email);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};
