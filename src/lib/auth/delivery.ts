import "server-only";

import type { AuthChannel } from "./identity";

/**
 * Delivery of confirmation codes.
 *
 * The code has to physically leave the server, and that needs an account with
 * somebody: an email API, an SMTP server, or an SMS gateway. Which one is
 * configured is read from the environment at call time, so adding credentials
 * is the whole installation step — no code changes.
 *
 * When nothing is configured the code cannot be sent at all. That case is
 * reported honestly to the caller, which then shows the code on screen and
 * says plainly that nothing was delivered. It is never silently swallowed.
 */

export interface DeliveryResult {
  delivered: boolean;
  /** Which provider handled it, for the log and for the UI's wording. */
  provider: string | null;
  error?: string;
}

const env = (key: string): string =>
  (process.env[key] ?? "").trim();

/** Sender address, falling back to something obviously non-production. */
function fromAddress(): string {
  return env("EMAIL_FROM") || "Buildora <onboarding@resend.dev>";
}

export function emailProvider(): "resend" | "smtp" | null {
  if (env("RESEND_API_KEY")) return "resend";
  if (env("SMTP_HOST")) return "smtp";
  return null;
}

export function smsProvider(): "twilio" | null {
  return env("TWILIO_ACCOUNT_SID") && env("TWILIO_AUTH_TOKEN") ? "twilio" : null;
}

/** True when a code sent to this channel will actually leave the server. */
export function canDeliver(channel: AuthChannel): boolean {
  return channel === "email" ? emailProvider() !== null : smsProvider() !== null;
}

export async function deliverCode(
  channel: AuthChannel,
  destination: string,
  code: string,
): Promise<DeliveryResult> {
  try {
    return channel === "email"
      ? await sendEmail(destination, code)
      : await sendSms(destination, code);
  } catch (error) {
    // A provider outage must not take the sign-up down with it: the caller
    // still has a valid challenge and the member can ask for a new code.
    return {
      delivered: false,
      provider: null,
      error: error instanceof Error ? error.message : "Delivery failed",
    };
  }
}

/* ------------------------------------------------------------------ email */

async function sendEmail(to: string, code: string): Promise<DeliveryResult> {
  const provider = emailProvider();
  if (!provider) return { delivered: false, provider: null };

  const subject = `${code} is your Buildora confirmation code`;

  if (provider === "resend") {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [to],
        subject,
        html: codeEmailHtml(code),
        text: codeEmailText(code),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        delivered: false,
        provider: "resend",
        error: `Resend responded ${response.status}. ${detail.slice(0, 300)}`,
      };
    }
    return { delivered: true, provider: "resend" };
  }

  // SMTP. nodemailer is an optional dependency: a deployment that only uses
  // Resend should not be forced to carry it.
  const { createTransport } = await import("nodemailer");
  const port = Number(env("SMTP_PORT") || 587);
  const transport = createTransport({
    host: env("SMTP_HOST"),
    port,
    // 465 is implicit TLS; 587 upgrades with STARTTLS.
    secure: port === 465,
    auth: env("SMTP_USER")
      ? { user: env("SMTP_USER"), pass: env("SMTP_PASSWORD") }
      : undefined,
  });

  await transport.sendMail({
    from: fromAddress(),
    to,
    subject,
    text: codeEmailText(code),
    html: codeEmailHtml(code),
  });

  return { delivered: true, provider: "smtp" };
}

/* -------------------------------------------------------------------- sms */

async function sendSms(to: string, code: string): Promise<DeliveryResult> {
  if (!smsProvider()) return { delivered: false, provider: null };

  const sid = env("TWILIO_ACCOUNT_SID");
  const body = new URLSearchParams({
    To: to,
    Body: `${code} is your Buildora confirmation code. It expires in 10 minutes. Never share it with anyone.`,
  });

  // Either a plain sender number or a Messaging Service — whichever is set.
  const messagingService = env("TWILIO_MESSAGING_SERVICE_SID");
  if (messagingService) body.set("MessagingServiceSid", messagingService);
  else body.set("From", env("TWILIO_FROM"));

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${sid}:${env("TWILIO_AUTH_TOKEN")}`,
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return {
      delivered: false,
      provider: "twilio",
      error: `Twilio responded ${response.status}. ${detail.slice(0, 300)}`,
    };
  }
  return { delivered: true, provider: "twilio" };
}

/* --------------------------------------------------------------- template */

function codeEmailText(code: string): string {
  return [
    `Your Buildora confirmation code is ${code}.`,
    "",
    "It expires in 10 minutes and can be used once.",
    "",
    "Buildora will never ask you for this code by phone, chat or email. If you did not",
    "request it, ignore this message — nobody can use it without your password.",
  ].join("\n");
}

function codeEmailHtml(code: string): string {
  // Inline styles and a table: email clients strip stylesheets and are erratic
  // with modern layout.
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:14px;border:1px solid #e4e6ea;overflow:hidden;">
        <tr><td style="padding:28px 32px 0;">
          <p style="margin:0;font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#0f172a;">Buildora</p>
        </td></tr>
        <tr><td style="padding:20px 32px 0;">
          <h1 style="margin:0;font-size:20px;line-height:1.35;font-weight:650;color:#0f172a;">Confirm your account</h1>
          <p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#475069;">
            Enter this code to finish signing in. It expires in 10 minutes and works once.
          </p>
        </td></tr>
        <tr><td style="padding:24px 32px 0;">
          <div style="background:#f5f6f8;border:1px solid #e4e6ea;border-radius:12px;padding:20px;text-align:center;">
            <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:32px;font-weight:700;letter-spacing:0.35em;color:#0f172a;">${code}</span>
          </div>
        </td></tr>
        <tr><td style="padding:24px 32px 32px;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
            Buildora will never ask you for this code by phone, chat or email. If you did
            not request it you can ignore this message — nobody can use the code
            without your password.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
