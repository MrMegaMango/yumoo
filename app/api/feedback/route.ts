import nodemailer from "nodemailer";
import { NextRequest, NextResponse } from "next/server";

type FeedbackPayload = {
  email: string;
  message: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "invalid-email";
  const visibleLocal =
    local.length <= 2 ? (local[0] ?? "*") : `${local[0]}***${local[local.length - 1]}`;
  return `${visibleLocal}@${domain}`;
}

function getMailConfig() {
  const smtpUser = process.env.GMAIL_USER?.trim();
  const smtpPass = process.env.GMAIL_APP_PASSWORD?.trim();
  const adminEmail = process.env.FEEDBACK_ADMIN_EMAIL?.trim();

  if (!smtpUser || !smtpPass || !adminEmail) return null;

  return { smtpUser, smtpPass, adminEmail };
}

function createTransporter(config: NonNullable<ReturnType<typeof getMailConfig>>) {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, message } = (body ?? {}) as Partial<FeedbackPayload>;

  if (
    typeof email !== "string" ||
    !email.trim() ||
    !email.includes("@") ||
    email.length > 200
  ) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  if (typeof message !== "string" || !message.trim() || message.length > 5000) {
    return NextResponse.json({ error: "A message is required (max 5000 characters)." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedMessage = message.trim();
  const requestId = Math.random().toString(36).slice(2, 10);

  console.log(`[feedback:${requestId}] Received from ${maskEmail(normalizedEmail)}`);

  const config = getMailConfig();

  if (!config) {
    console.warn(`[feedback:${requestId}] Email config missing — skipping send`);
    return NextResponse.json({ success: true, emailSent: false });
  }

  const transporter = createTransporter(config);

  try {
    await transporter.sendMail({
      from: `Yumoo <${config.smtpUser}>`,
      to: config.adminEmail,
      replyTo: normalizedEmail,
      subject: `Yumoo feedback from ${normalizedEmail}`,
      html: `
        <div style="font-family: sans-serif; max-width: 700px; margin: 0 auto;">
          <h2 style="color: #111827; margin-bottom: 12px;">New feedback</h2>
          <p style="margin: 0 0 8px;"><strong>From:</strong> ${escapeHtml(normalizedEmail)}</p>
          <p style="margin: 0 0 6px;"><strong>Message:</strong></p>
          <pre style="white-space: pre-wrap; margin: 0; background: #f9fafb; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">${escapeHtml(normalizedMessage)}</pre>
        </div>
      `,
      text: `New feedback\n\nFrom: ${normalizedEmail}\n\nMessage:\n${normalizedMessage}`,
    });

    console.log(`[feedback:${requestId}] Admin notification sent`);
  } catch (error) {
    console.error(`[feedback:${requestId}] Admin notification failed:`, error);
    return NextResponse.json({ error: "Failed to send feedback. Please try again." }, { status: 500 });
  }

  try {
    await transporter.sendMail({
      from: `Yumoo <${config.smtpUser}>`,
      to: normalizedEmail,
      subject: "Got your feedback — thanks!",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #111827;">Thanks for the feedback!</h2>
          <p>I received your message and will get back to you if needed.</p>
          <blockquote style="margin: 16px 0; padding: 12px 16px; background: #f9fafb; border-left: 3px solid #e5e7eb; color: #374151;">
            ${escapeHtml(normalizedMessage)}
          </blockquote>
          <p style="color: #6b7280; font-size: 14px;">— Yumoo</p>
        </div>
      `,
      text: `Thanks for the feedback!\n\nI received your message and will get back to you if needed.\n\nYour message:\n${normalizedMessage}\n\n— Yumoo`,
    });

    console.log(`[feedback:${requestId}] Confirmation sent to ${maskEmail(normalizedEmail)}`);
  } catch (error) {
    console.error(`[feedback:${requestId}] Confirmation email failed:`, error);
    // Don't fail the request — admin already got the feedback
  }

  return NextResponse.json({ success: true, emailSent: true });
}
