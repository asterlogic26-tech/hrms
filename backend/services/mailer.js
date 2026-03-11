const nodemailer = require('nodemailer');

// Only create a transporter if SMTP is configured
function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Send a leave request notification email to the approver.
 */
async function sendLeaveRequestEmail({ approverEmail, approverName, employeeName, leaveType, startDate, endDate, reason }) {
  const transporter = getTransporter();
  if (!transporter) return; // SMTP not configured — skip silently

  const subject = `Leave Request: ${employeeName} (${leaveType})`;
  const body = `
Hi ${approverName},

${employeeName} has submitted a ${leaveType} leave request that requires your approval.

  From:   ${startDate}
  To:     ${endDate}
  Reason: ${reason || 'Not specified'}

Please log in to the HRMS portal to approve or reject this request.

— HRMS System
`.trim();

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: approverEmail,
      subject,
      text: body,
    });
  } catch (err) {
    console.error('[mailer] Failed to send leave notification:', err.message);
  }
}

module.exports = { sendLeaveRequestEmail };
