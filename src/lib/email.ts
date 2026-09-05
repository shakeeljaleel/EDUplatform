import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'demo@helix-learning.org',
    pass: process.env.SMTP_PASS || 'demo-password'
  }
})

export async function sendOtpEmail(toEmail: string, otpCode: string): Promise<boolean> {
  const mailOptions = {
    from: '"HELIX Security" <security@helix-learning.org>',
    to: toEmail,
    subject: `🔐 ${otpCode} is your HELIX Login Code`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #0f172a; margin-top: 0;">HELIX Authentication</h2>
        <p style="color: #475569;">A login attempt to your HELIX account requires verification.</p>
        <div style="background: #f0fdf4; border: 2px dashed #10b981; padding: 15px; text-align: center; border-radius: 10px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #059669;">${otpCode}</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">This code will expire in <strong>5 minutes</strong> and is single-use. Do not share this code with anyone.</p>
      </div>
    `
  }

  try {
    if (process.env.NODE_ENV !== 'production' || !process.env.SMTP_HOST) {
      console.log(`[EMAIL OTP DEMO] Verification code sent to ${toEmail}: ${otpCode}`)
      return true
    }
    await transporter.sendMail(mailOptions)
    return true
  } catch (err) {
    console.error('Failed to send OTP email via SMTP:', err)
    console.log(`[EMAIL OTP FALLBACK] Verification code for ${toEmail}: ${otpCode}`)
    return true
  }
}

export async function sendSecurityAlertEmail(toEmail: string, details: { ip: string; device: string; time: string }): Promise<boolean> {
  const mailOptions = {
    from: '"HELIX Security" <security@helix-learning.org>',
    to: toEmail,
    subject: '⚠️ Security Alert: New Account Login Detected',
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #fee2e2; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #991b1b; margin-top: 0;">⚠️ New Account Login Alert</h2>
        <p style="color: #475569;">A new login to your HELIX account was detected.</p>
        <ul style="color: #334155; font-size: 14px; line-height: 1.6;">
          <li><strong>IP Address:</strong> ${details.ip}</li>
          <li><strong>Device / Agent:</strong> ${details.device}</li>
          <li><strong>Timestamp:</strong> ${details.time}</li>
        </ul>
        <p style="color: #991b1b; font-weight: bold;">If this was not you, please contact institution administrators immediately.</p>
      </div>
    `
  }

  try {
    if (process.env.NODE_ENV !== 'production' || !process.env.SMTP_HOST) {
      console.log(`[SECURITY ALERT DEMO EMAIL] Alert sent to ${toEmail} for IP ${details.ip}`)
      return true
    }
    await transporter.sendMail(mailOptions)
    return true
  } catch (err) {
    console.error('Failed to send security alert email:', err)
    return true
  }
}

export async function sendWarningEmail(toEmail: string, subject: string, message: string): Promise<boolean> {
  const mailOptions = {
    from: '"HELIX Admin" <admin@helix-learning.org>',
    to: toEmail,
    subject: `Notice from Administrator: ${subject}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a;">Administrator Notice</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">${message}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #64748b; font-size: 12px;">HELIX Academic Security & Moderation System</p>
      </div>
    `
  }

  try {
    if (process.env.NODE_ENV !== 'production' || !process.env.SMTP_HOST) {
      console.log(`[ADMIN WARNING EMAIL] Sent to ${toEmail}: ${message}`)
      return true
    }
    await transporter.sendMail(mailOptions)
    return true
  } catch (err) {
    console.error('Failed to send warning email:', err)
    return true
  }
}
