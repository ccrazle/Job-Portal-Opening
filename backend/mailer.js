const nodemailer = require('nodemailer');

const HAS_SMTP = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter = null;
if (HAS_SMTP) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function appBaseUrl() {
  return process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
}

async function sendMail({ to, subject, html, text }) {
  if (!HAS_SMTP) {
    console.log('\n───── [EMAIL: console fallback — SMTP not configured] ─────');
    console.log(`  To:      ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Text:    ${text || '(html-only)'}`);
    console.log('─────────────────────────────────────────────────────────\n');
    return { ok: true, fallback: true };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  try {
    const info = await transporter.sendMail({ from, to, subject, html, text });
    console.log(`  ✉ Sent to ${to}: ${info.messageId}`);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error(`  ✗ Mail send failed to ${to}:`, err.message);
    return { ok: false, error: err.message };
  }
}

function verifyEmailTemplate({ name, url }) {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  return {
    subject: 'Verify your email — Job Portal',
    text: `${greeting}\n\nPlease verify your email by opening this link (valid for 1 hour):\n\n${url}\n\nIf you didn't request this, ignore this email.`,
    html: `<p>${greeting}</p><p>Please verify your email by clicking the button below. The link is valid for 1 hour.</p><p><a href="${url}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px">Verify Email</a></p><p>Or paste this link: <br><code>${url}</code></p><p style="color:#666;font-size:12px">If you didn't request this, ignore this email.</p>`,
  };
}

function resetPasswordTemplate({ name, url }) {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  return {
    subject: 'Reset your password — Job Portal',
    text: `${greeting}\n\nReset your password using this link (valid for 1 hour):\n\n${url}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `<p>${greeting}</p><p>Click below to set a new password. The link is valid for 1 hour.</p><p><a href="${url}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px">Reset Password</a></p><p>Or paste this link: <br><code>${url}</code></p><p style="color:#666;font-size:12px">If you didn't request this, ignore this email.</p>`,
  };
}

function signupVerifyTemplate({ url }) {
  return {
    subject: 'Verify your email to continue sign-up — Job Portal',
    text: `Hi,\n\nPlease verify your email to continue creating your Job Portal account.\n\nOpen this link (valid for 1 hour):\n\n${url}\n\nAfter clicking, return to the sign-up page — it will update automatically.\n\nIf you didn't start a sign-up, ignore this email.`,
    html: `<p>Hi,</p><p>Please verify your email to continue creating your Job Portal account. The link is valid for 1 hour.</p><p><a href="${url}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px">Verify Email</a></p><p>After clicking, return to the sign-up page — it will update automatically.</p><p>Or paste this link: <br><code>${url}</code></p><p style="color:#666;font-size:12px">If you didn't start a sign-up, ignore this email.</p>`,
  };
}

function changeLoginIdTemplate({ name, newLoginId, url }) {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  return {
    subject: 'Confirm login ID change — Job Portal',
    text: `${greeting}\n\nConfirm your new login ID: ${newLoginId}\n\nClick this link to confirm (valid for 1 hour):\n\n${url}\n\nIf you didn't request this, ignore this email — your login ID will stay the same.`,
    html: `<p>${greeting}</p><p>Confirm your new login ID: <strong>${newLoginId}</strong></p><p><a href="${url}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px">Confirm New Login ID</a></p><p>Or paste this link: <br><code>${url}</code></p><p style="color:#666;font-size:12px">If you didn't request this, ignore this email — your login ID will stay the same.</p>`,
  };
}

module.exports = {
  sendMail,
  appBaseUrl,
  hasSmtp: () => HAS_SMTP,
  verifyEmailTemplate,
  resetPasswordTemplate,
  changeLoginIdTemplate,
  signupVerifyTemplate,
};
