import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "AI Governance Tower <noreply@aigovernancetower.com>";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://aigovernancetower.com";

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const verifyUrl = `${BASE_URL}/verify-email?token=${token}`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Verify your AI Governance Tower account",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">

          <!-- Header -->
          <tr>
            <td style="background:#0f172a;padding:32px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                  🛡 AI Governance Tower
                </span>
              </div>
              <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">Enterprise AI Compliance Platform</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
                Verify your email address
              </h1>
              <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 28px;">
                Hi ${name},<br/><br/>
                Welcome to AI Governance Control Tower. Click the button below to verify your email and activate your account.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${verifyUrl}"
                       style="display:inline-block;background:#0f172a;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:0.2px;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color:#94a3b8;font-size:13px;text-align:center;margin:24px 0 0;">
                This link expires in <strong>24 hours</strong>.
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0;" />

              <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
                If you didn't create an account, you can safely ignore this email.<br/>
                If the button above doesn't work, copy and paste this URL into your browser:<br/>
                <a href="${verifyUrl}" style="color:#6366f1;word-break:break-all;">${verifyUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center;">
                © ${new Date().getFullYear()} AI Governance Tower · DPDP Act 2023 · ISO 42001 Compliant
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });
}
