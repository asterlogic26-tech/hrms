require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  tls: { ciphers: 'SSLv3', rejectUnauthorized: false },
});

console.log('Testing SMTP connection to', process.env.SMTP_HOST);

transporter.verify((err, success) => {
  if (err) {
    console.error('SMTP connection FAILED:', err.message);
    process.exit(1);
  }
  console.log('SMTP connection OK — sending test email...');
  transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: process.env.SMTP_USER,
    subject: 'HRMS Test Email',
    text: 'If you see this, email notifications are working!',
  }, (err2, info) => {
    if (err2) console.error('Send FAILED:', err2.message);
    else console.log('Email sent! MessageId:', info.messageId);
    process.exit(0);
  });
});
