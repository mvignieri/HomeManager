import nodemailer from 'nodemailer';

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';

// Create transporter based on environment
const transporter = nodemailer.createTransport(
  isProduction
    ? {
        // Production: use configured SMTP service (SendGrid, Mailgun, Resend, etc.)
        host: process.env.EMAIL_HOST || 'smtp.sendgrid.net',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER!,
          pass: process.env.EMAIL_PASSWORD!,
        },
      }
    : {
        // Development: use Mailhog
        host: 'localhost',
        port: 1025,
        secure: false,
        ignoreTLS: true,
      }
);

export interface InvitationEmailData {
  email: string;
  houseName: string;
  inviterName: string;
  role: string;
  inviteLink: string;
}

export async function sendInvitationEmail(data: InvitationEmailData): Promise<void> {
  const { email, houseName, inviterName, role, inviteLink } = data;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>House Invitation</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #6366f1;
            margin: 0;
            font-size: 28px;
          }
          .content {
            margin-bottom: 30px;
          }
          .content p {
            margin-bottom: 16px;
          }
          .highlight {
            background-color: #f0f0f0;
            padding: 16px;
            border-radius: 6px;
            margin: 20px 0;
          }
          .highlight strong {
            color: #6366f1;
          }
          .button-container {
            text-align: center;
            margin: 30px 0;
          }
          .button {
            display: inline-block;
            padding: 14px 32px;
            background-color: #6366f1;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
          }
          .button:hover {
            background-color: #4f46e5;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
          }
          .link {
            color: #6366f1;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏠 HomeManager Invitation</h1>
          </div>

          <div class="content">
            <p>Hello!</p>

            <p>
              <strong>${inviterName}</strong> has invited you to join their house
              <strong>"${houseName}"</strong> on HomeManager.
            </p>

            <div class="highlight">
              <p style="margin: 0;"><strong>House:</strong> ${houseName}</p>
              <p style="margin: 8px 0 0 0;"><strong>Your Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
            </div>

            <p>
              Click the button below to accept the invitation and join the house.
              You'll be able to manage tasks, control smart home devices, and collaborate
              with other members.
            </p>
          </div>

          <div class="button-container">
            <a href="${inviteLink}" class="button">Accept Invitation</a>
          </div>

          <div class="content">
            <p style="font-size: 14px; color: #666;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="font-size: 14px;">
              <a href="${inviteLink}" class="link">${inviteLink}</a>
            </p>
          </div>

          <div class="footer">
            <p>This invitation will expire in 7 days.</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
HomeManager Invitation

Hello!

${inviterName} has invited you to join their house "${houseName}" on HomeManager.

House: ${houseName}
Your Role: ${role.charAt(0).toUpperCase() + role.slice(1)}

Click the link below to accept the invitation:
${inviteLink}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.
  `;

  const fromEmail = process.env.EMAIL_FROM || '"HomeManager" <noreply@homemanager.app>';

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: `You've been invited to join ${houseName} on HomeManager`,
      text: textContent,
      html: htmlContent,
    });

    console.log(`Invitation email sent to ${email}`);
  } catch (error) {
    console.error('Error sending invitation email:', error);
    throw new Error('Failed to send invitation email');
  }
}

// Test email connection
export async function testEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('Email server connection verified');
    return true;
  } catch (error) {
    console.error('Email server connection failed:', error);
    return false;
  }
}
