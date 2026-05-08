import "server-only";
import { Resend } from "resend";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const FROM_NAME = process.env.RESEND_FROM_NAME ?? "PerformaAI";
// Must be an email on a domain you have verified in Resend (resend.com/domains)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

export interface SendReviewEmailPayload {
  to: string;
  employeeName: string;
  cycleTitle: string;
  formToken: string;
  deadline?: string | null;
}

/** Resend wraps network / DNS failures as this message; see resend-node SDK. */
const RESEND_FETCH_FAILURE =
  "Unable to fetch data. The request could not be resolved.";

function humanizeResendError(raw: string): string {
  const t = raw.trim();
  if (
    t === RESEND_FETCH_FAILURE ||
    t.toLowerCase().includes("could not be resolved")
  ) {
    return (
      "Email service could not be reached (network, DNS, or firewall). " +
      "Check RESEND_API_KEY, outbound HTTPS to api.resend.com, and try again."
    );
  }
  return t;
}

export async function sendReviewFormEmail(
  payload: SendReviewEmailPayload,
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return {
      success: false,
      error:
        "RESEND_API_KEY is not set. Add it in .env so review invite emails can send via Resend.",
    };
  }

  const resend = new Resend(apiKey);

  const { to, employeeName, cycleTitle, formToken, deadline } = payload;
  const reviewUrl = `${SITE_URL}/review-form/${formToken}`;
  const deadlineText = deadline
    ? `Please complete it by <strong>${new Date(deadline).toLocaleDateString(undefined, { dateStyle: "long" })}</strong>.`
    : "Please complete it at your earliest convenience.";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px;">
            <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:700;">${FROM_NAME}</h1>
            <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">Performance Review System</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="color:#111827;font-size:16px;margin:0 0 16px;">Hi <strong>${employeeName}</strong>,</p>
            <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
              Your manager has invited you to complete a self-review as part of the <strong>${cycleTitle}</strong> review cycle.
            </p>
            <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">${deadlineText}</p>
            <div style="text-align:center;margin:0 0 28px;">
              <a href="${reviewUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
                Start my self-review →
              </a>
            </div>
            <p style="color:#6b7280;font-size:13px;margin:0 0 8px;">Or copy this link into your browser:</p>
            <p style="color:#6366f1;font-size:13px;word-break:break-all;margin:0 0 28px;">${reviewUrl}</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;" />
            <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0;">
              This link is unique to you and expires when the review cycle closes.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Hi ${employeeName},\n\nYou have been invited to complete a self-review for the "${cycleTitle}" review cycle.\n\n${deadline ? `Deadline: ${new Date(deadline).toLocaleDateString(undefined, { dateStyle: "long" })}` : ""}\n\nStart your review: ${reviewUrl}\n\nThis link is unique to you.`;

  try {
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject: `Action required: Self-review for ${cycleTitle}`,
      html,
      text,
    });

    if (error) {
      return { success: false, error: humanizeResendError(error.message) };
    }
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: humanizeResendError(msg) };
  }
}

export interface SendWorkspaceInviteEmailPayload {
  to: string;
  employeeName: string;
  workspaceName: string;
  accessRoleLabel: string;
  signInLink: string;
}

/** Resend-based delivery when Supabase `/invite` cannot run (already linked) or as backup. */
export async function sendWorkspaceInviteEmail(
  payload: SendWorkspaceInviteEmailPayload,
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return {
      success: false,
      error:
        "Set RESEND_API_KEY to send workspace invitations for existing accounts. Brand-new accounts may still use Supabase Auth email if it is enabled.",
    };
  }

  const resend = new Resend(apiKey);

  const { to, employeeName, workspaceName, accessRoleLabel, signInLink } = payload;
  const subject = `Invitation: ${workspaceName} on ${FROM_NAME}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px;">
            <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:700;">${FROM_NAME}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="color:#111827;font-size:16px;margin:0 0 16px;">Hi <strong>${employeeName}</strong>,</p>
            <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
              You&apos;ve been invited to <strong>${workspaceName}</strong> with workspace access:
              <strong>${accessRoleLabel}</strong>.
            </p>
            <div style="text-align:center;margin:0 0 28px;">
              <a href="${signInLink}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
                Open sign-in link →
              </a>
            </div>
            <p style="color:#6b7280;font-size:13px;margin:0 0 12px;">Or paste this link:</p>
            <p style="color:#6366f1;font-size:13px;word-break:break-all;margin:0;">${signInLink}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Hi ${employeeName},\n\nYou've been invited to "${workspaceName}" as ${accessRoleLabel}.\n\nSign in:\n${signInLink}\n`;

  try {
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    });

    if (error) return { success: false, error: humanizeResendError(error.message) };
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: humanizeResendError(msg) };
  }
}
