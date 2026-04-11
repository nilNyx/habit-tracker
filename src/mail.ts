import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendWelcomeEmail(email: string, name: string) {
  const welcomeText = `Hello ${name}! This is a test message.`;
  const subject = 'test';

  await transporter.sendMail({
    from: '"My app" <noreply@myapp.com>',
    to: email,
    subject: subject,
    text: welcomeText,
    html: `<p>${welcomeText}</p>`
  });
}
