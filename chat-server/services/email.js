/**
 * Keymus Chat — Email Service
 * Sends transactional emails using Nodemailer.
 *
 * Supports:
 *  - SMTP (Gmail, Outlook, custom)
 *  - Fallback: logs to console when no email config is set
 */
const nodemailer = require('nodemailer');

// ── Transporter Setup ─────────────────────────────────────────────────────────
let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        console.warn('[Email] SMTP not configured — emails will be logged to console only');
        return null;
    }

    transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
    });

    // Verify connection
    transporter.verify().then(() => {
        console.log('✓ Email service connected');
    }).catch(err => {
        console.error('✗ Email service failed:', err.message);
        transporter = null;
    });

    return transporter;
}

// ── Send Registration Confirmation ────────────────────────────────────────────
async function sendRegistrationEmail({ to, firstName, lastName }) {
    const fromName = process.env.EMAIL_FROM_NAME || 'Keymus Ecommerce';
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || 'noreply@keymus.com';

    const subject = 'Welcome to Keymus — Registration Confirmed!';

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .body { padding: 30px; }
        .body h2 { color: #333; margin-top: 0; }
        .body p { color: #555; line-height: 1.6; font-size: 16px; }
        .steps { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .steps h3 { color: #667eea; margin-top: 0; }
        .steps ol { color: #555; padding-left: 20px; }
        .steps li { margin-bottom: 10px; }
        .footer { padding: 20px 30px; background: #f8f9fa; text-align: center; color: #888; font-size: 14px; }
        .highlight { color: #667eea; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <h1>Welcome to Keymus!</h1>
            </div>
            <div class="body">
                <h2>Hi ${firstName} ${lastName},</h2>
                <p>Thank you for registering with <span class="highlight">Keymus Ecommerce</span>! We're thrilled to have you on board.</p>
                <p>Your registration has been received and is being reviewed by our team.</p>

                <div class="steps">
                    <h3>What Happens Next?</h3>
                    <ol>
                        <li><strong>Review:</strong> Our team will review your registration within 24–48 hours.</li>
                        <li><strong>Contact:</strong> A team member will reach out to you with next steps.</li>
                        <li><strong>Onboarding:</strong> You'll be guided through the onboarding process to get started.</li>
                    </ol>
                </div>

                <p>In the meantime, feel free to explore our website and learn more about the PEA program and how you can start earning.</p>
                <p>If you have any questions, don't hesitate to use the chat widget on our website — we're here to help!</p>
                <p>Welcome aboard,<br><span class="highlight">The Keymus Team</span></p>
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Keymus Ecommerce. All rights reserved.</p>
                <p>You received this email because you registered at keymus.com</p>
            </div>
        </div>
    </div>
</body>
</html>`;

    const text = `Hi ${firstName} ${lastName},

Thank you for registering with Keymus Ecommerce! We're thrilled to have you on board.

Your registration has been received and is being reviewed by our team.

What Happens Next?
1. Review: Our team will review your registration within 24-48 hours.
2. Contact: A team member will reach out to you with next steps.
3. Onboarding: You'll be guided through the onboarding process to get started.

In the meantime, feel free to explore our website and learn more about the PEA program.

Welcome aboard,
The Keymus Team`;

    const mailOptions = {
        from: `"${fromName}" <${fromAddress}>`,
        to,
        subject,
        text,
        html
    };

    const transport = getTransporter();

    if (!transport) {
        // Log email to console when SMTP is not configured
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 EMAIL (logged — SMTP not configured)');
        console.log(`   To:      ${to}`);
        console.log(`   Subject: ${subject}`);
        console.log(`   Body:    Registration confirmation for ${firstName} ${lastName}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        return true; // Return true so we still mark email_sent
    }

    try {
        const info = await transport.sendMail(mailOptions);
        console.log(`[Email] Sent to ${to}: ${info.messageId}`);
        return true;
    } catch (err) {
        console.error(`[Email] Failed to send to ${to}:`, err.message);
        return false;
    }
}

module.exports = { sendRegistrationEmail, getTransporter };
