const nodemailer = require('nodemailer');
const logger = require('./logger');

// ── T.I.P. brand palette ────────────────────────────────────────────────────
const BRAND = {
  gold: '#FFC107',
  goldDark: '#E6A800',
  black: '#111111',
  headerText: '#FFFFFF',
  bodyBg: '#F4F4F4',
  cardBg: '#FFFFFF',
  footerText: '#888888',
  bodyText: '#333333',
};

/**
 * Wraps `bodyContent` in the standard T.I.P. email shell.
 * @param {string} headline   - Large text shown in the header banner
 * @param {string} bodyContent - Inner HTML placed inside the white card
 */
function buildEmailHtml(headline, bodyContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${headline}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bodyBg};font-family:Arial,Helvetica,sans-serif;color:${BRAND.bodyText};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bodyBg};padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Gold top accent stripe -->
          <tr>
            <td style="background-color:${BRAND.gold};height:6px;border-radius:6px 6px 0 0;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND.gold};padding:28px 32px 22px;text-align:center;">
              <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${BRAND.black};font-weight:700;margin-bottom:8px;">
                STUDENT ADVISING PORTAL
              </div>
              <h1 style="margin:0;font-size:22px;font-weight:700;color:${BRAND.black};line-height:1.3;">
                ${headline}
              </h1>
            </td>
          </tr>

          <!-- Body card -->
          <tr>
            <td style="background-color:${BRAND.cardBg};padding:36px 40px;">
              ${bodyContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:${BRAND.gold};padding:18px 32px;text-align:center;border-radius:0 0 6px 6px;">
              <p style="margin:0 0 4px;font-size:11px;color:${BRAND.black};font-weight:700;letter-spacing:1px;">
                T.I.P. STUDENT ADVISING PORTAL
              </p>
              <p style="margin:0;font-size:11px;color:#555555;">
                This is an automated message — please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// CLIENT_URL may contain comma-separated origins; use the first one.
function getClientUrl() {
  const raw = (process.env.CLIENT_URL || '').trim();
  return raw.split(',')[0].trim().replace(/\/$/, '');
}

function buildActivationUrl(token) {
  const explicitBase = (process.env.ACTIVATION_URL_BASE || '').trim();
  if (explicitBase) {
    return `${explicitBase.replace(/\/$/, '')}/${token}`;
  }

  const clientUrl = getClientUrl();
  if (clientUrl) {
    return `${clientUrl}/activate/${token}`;
  }

  const serverPublicUrl = (
    process.env.SERVER_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`
  ).trim();
  return `${serverPublicUrl.replace(/\/$/, '')}/api/auth/activate/${token}`;
}

// Create transporter
const createTransporter = () => {
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  // Port 465 uses implicit TLS (secure: true).
  // Port 587 uses STARTTLS (secure: false + requireTLS: true).
  const useImplicitTls = port === 465;
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure: useImplicitTls,
    requireTLS: !useImplicitTls,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Send activation email
exports.sendActivationEmail = async (email, token) => {
  const transporter = createTransporter();

  const activationUrl = buildActivationUrl(token);

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Activate Your Student Advising Account',
    html: buildEmailHtml(
      'Activate Your Account',
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Thank you for registering! Please click the button below to activate your account.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${activationUrl}"
           style="display:inline-block;padding:13px 36px;background-color:${BRAND.gold};color:${BRAND.black};font-weight:700;font-size:15px;text-decoration:none;border-radius:4px;letter-spacing:0.3px;">
          Activate Account
        </a>
      </div>
      <p style="margin:0 0 8px;font-size:13px;color:#666;">Or copy and paste this link into your browser:</p>
      <p style="margin:0 0 20px;font-size:12px;word-break:break-all;color:#555;background:#f8f8f8;padding:10px 14px;border-left:3px solid ${BRAND.gold};border-radius:2px;">${activationUrl}</p>
      <p style="margin:0;font-size:13px;color:#888;"><strong>Note:</strong> This link will expire in <strong>24 hours</strong>. If you did not create this account, you may safely ignore this email.</p>`,
    ),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info({ email }, 'activation email sent');
  } catch (error) {
    console.error('Error sending activation email:', error);
    throw new Error('Failed to send activation email', { cause: error });
  }
};

// Send welcome email after activation
exports.sendWelcomeEmail = async (email, firstName) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Welcome to Student Advising System',
    html: buildEmailHtml(
      `Welcome, ${firstName}!`,
      `<h2 style="margin:0 0 16px;font-size:18px;font-weight:700;color:${BRAND.black};">Your account is now active.</h2>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.7;">Congratulations! Your T.I.P. Student Advising Portal account has been successfully activated.</p>
      <p style="margin:0;font-size:15px;line-height:1.7;">You can now log in and start using the portal to manage your academic advising.</p>`,
    ),
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
    html: buildEmailHtml(
      'Two-Factor Authentication',
      `<p style="margin:0 0 6px;font-size:16px;font-weight:700;color:${BRAND.black};">Hello, ${firstName || 'User'}!</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.7;">You requested to log in to the T.I.P. Student Advising Portal. Use the verification code below to proceed.</p>
      <div style="background-color:${BRAND.black};border-radius:8px;padding:24px 20px;text-align:center;margin:0 0 24px;">
        <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:${BRAND.gold};font-family:'Courier New',Courier,monospace;">${code}</span>
      </div>
      <ul style="margin:0;padding-left:20px;font-size:13px;color:#555;line-height:2.0;">
        <li>This code expires in <strong>10 minutes</strong></li>
        <li>Never share this code with anyone</li>
        <li>If you did not request this, please ignore this email</li>
      </ul>`,
    ),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info({ email }, 'verification code sent');
  } catch (error) {
    console.error('Error sending verification code:', error);
    throw new Error('Failed to send verification code', { cause: error });
  }
};

// Send password reset email
exports.sendPasswordResetEmail = async (email, token, firstName) => {
  const transporter = createTransporter();

  const resetUrl = `${getClientUrl()}/reset-password/${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Password Reset Request - Student Advising Portal',
    html: buildEmailHtml(
      'Password Reset Request',
      `<p style="margin:0 0 6px;font-size:16px;font-weight:700;color:${BRAND.black};">Hello, ${firstName || 'User'}!</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.7;">We received a request to reset the password for your T.I.P. Student Advising Portal account. Click the button below to proceed.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${resetUrl}"
           style="display:inline-block;padding:13px 36px;background-color:${BRAND.gold};color:${BRAND.black};font-weight:700;font-size:15px;text-decoration:none;border-radius:4px;letter-spacing:0.3px;">
          Reset Password
        </a>
      </div>
      <p style="margin:0 0 8px;font-size:13px;color:#666;">Or copy and paste this link into your browser:</p>
      <p style="margin:0 0 20px;font-size:12px;word-break:break-all;color:#555;background:#f8f8f8;padding:10px 14px;border-left:3px solid ${BRAND.gold};border-radius:2px;">${resetUrl}</p>
      <ul style="margin:0;padding-left:20px;font-size:13px;color:#555;line-height:2.0;">
        <li>This link expires in <strong>30 minutes</strong></li>
        <li>If you did not request a password reset, please ignore this email</li>
        <li>Your password will not change until you click the link and set a new one</li>
      </ul>`,
    ),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info({ email }, 'password reset email sent');
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email', { cause: error });
  }
};

// Send email change verification code (Phase 2A)
exports.sendEmailChangeVerificationCode = async (newEmail, code, firstName) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: newEmail,
    subject: 'Verify Your New Email — Student Advising Portal',
    html: buildEmailHtml(
      'Email Verification',
      `<p style="margin:0 0 6px;font-size:16px;font-weight:700;color:${BRAND.black};">Hello, ${firstName || 'Program Chair'}!</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.7;">As part of your account setup, you must verify ownership of this email address before it can be activated. Enter the code below in the verification form.</p>
      <div style="background-color:${BRAND.black};border-radius:8px;padding:24px 20px;text-align:center;margin:0 0 24px;">
        <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:${BRAND.gold};font-family:'Courier New',Courier,monospace;">${code}</span>
      </div>
      <ul style="margin:0;padding-left:20px;font-size:13px;color:#555;line-height:2.0;">
        <li>This code expires in <strong>10 minutes</strong></li>
        <li>Never share this code with anyone</li>
        <li>Your account will remain restricted until email verification is complete</li>
      </ul>`,
    ),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info({ email: newEmail }, 'email change verification code sent');
  } catch (error) {
    console.error('Error sending email change verification code:', error);
    throw new Error('Failed to send email verification code', { cause: error });
  }
};
