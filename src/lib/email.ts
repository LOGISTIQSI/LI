import { Resend } from "resend";

const EMAIL_FROM =
  process.env.EMAIL_FROM || "LOGISTIQS Intelligence <noreply@logistiqs.co.za>";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  const resend = getResend();

  // Dev mode: log to console if no API key
  if (!resend) {
    console.log("─────── EMAIL (dev mode — no RESEND_API_KEY) ───────");
    console.log(`From:    ${EMAIL_FROM}`);
    console.log(`To:      ${params.to}`);
    console.log(`Subject: ${params.subject}`);
    console.log(`Text:    ${params.text}`);
    if (params.html) {
      console.log(`HTML:    ${params.html.slice(0, 500)}...`);
    }
    console.log("──────────────────────────────────────────────────────");
    return { success: true, messageId: "dev-mode" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });

    if (error) {
      console.error("Resend send error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown email error";
    console.error("Resend exception:", err);
    return { success: false, error: message };
  }
}
