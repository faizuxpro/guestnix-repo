import { getPublicAppOrigin } from "@/lib/app-url";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type BrandedEmailAction = {
  label: string;
  url: string;
};

type BrandedEmailInput = {
  preheader: string;
  eyebrow?: string;
  title: string;
  bodyHtml: string;
  action?: BrandedEmailAction;
  footerNote?: string;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const PRODUCTION_ASSET_ORIGIN = "https://guestnix.com";
const BRAND_LOGO_PATH = "/brand/Guestnix full logo (for dark bg).svg";
const EMAIL_FONT_STACK =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
const BRAND_FONT_STACK =
  "'Bricolage Grotesque', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";

const EMAIL_BRAND = {
  ink: "#042129",
  mid: "#0A3D4D",
  mint: "#6FEF8B",
  paleMint: "#ECFFF5",
  panel: "#F5F8F8",
  background: "#F3F5F6",
  surface: "#FFFFFF",
  border: "#DDE8EC",
  text: "#042129",
  bodyText: "#53666F",
  muted: "#82939A",
  softMuted: "#8A9BA3",
} as const;

type EmailProvider = "resend" | "brevo";

function emailProvider(): EmailProvider {
  const configured = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (configured === "resend" || configured === "brevo") {
    return configured;
  }
  if (process.env.BREVO_API_KEY?.trim()) return "brevo";
  if (process.env.RESEND_API_KEY?.trim()) return "resend";
  return "brevo";
}

function appName() {
  return process.env.NEXT_PUBLIC_APP_NAME ?? "Guestnix";
}

function isLocalOrigin(origin: string) {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.endsWith(".localhost")
    );
  } catch {
    return false;
  }
}

function emailAssetUrl(path: string) {
  const origin = getPublicAppOrigin();
  const assetOrigin = isLocalOrigin(origin) ? PRODUCTION_ASSET_ORIGIN : origin;

  return new URL(path, assetOrigin).toString();
}

function parseAddress(value: string) {
  const match = value.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
  if (!match) return { email: value.trim(), name: appName() };
  return {
    name: match[1].trim().replace(/^"|"$/g, "") || appName(),
    email: match[2].trim(),
  };
}

function emailFrom(provider: EmailProvider) {
  const value =
    process.env.EMAIL_FROM?.trim() ||
    (provider === "brevo"
      ? process.env.BREVO_FROM_EMAIL?.trim()
      : process.env.RESEND_FROM_EMAIL?.trim()) ||
    `${appName()} <onboarding@resend.dev>`;

  return {
    raw: value,
    parsed: parseAddress(value),
  };
}

export async function sendEmail(input: SendEmailInput) {
  const provider = emailProvider();

  if (provider === "brevo") {
    return sendBrevoEmail(input);
  }

  return sendResendEmail(input);
}

export function renderBrandedEmail(input: BrandedEmailInput) {
  const app = appName();
  const logoUrl = emailAssetUrl(BRAND_LOGO_PATH);
  const escapedPreheader = escapeHtml(input.preheader);
  const escapedEyebrow = escapeHtml(input.eyebrow ?? app);
  const escapedTitle = escapeHtml(input.title);
  const footerNote = input.footerNote
    ? `<p style="margin:0 0 10px;font-size:13px;line-height:20px;color:${EMAIL_BRAND.muted}">${escapeHtml(
        input.footerNote
      )}</p>`
    : "";
  const actionHtml = input.action
    ? `
                    <table cellpadding="0" cellspacing="0" role="presentation" align="center">
                      <tr>
                        <td style="background:${EMAIL_BRAND.ink};border-radius:12px">
                          <a href="${escapeHtml(input.action.url)}" style="display:inline-block;padding:15px 28px;font-size:15px;font-weight:800;line-height:20px;color:${EMAIL_BRAND.mint};text-decoration:none;border-radius:12px">
                            ${escapeHtml(input.action.label)}
                          </a>
                        </td>
                      </tr>
                    </table>
    `
    : "";
  const fallbackHtml = input.action
    ? `
                <tr>
                  <td style="padding:0 34px 34px">
                    <p style="margin:0 0 8px;font-size:13px;line-height:20px;color:#7A8B92">
                      Button not working? Open this secure link:
                    </p>
                    <a href="${escapeHtml(input.action.url)}" style="font-size:13px;line-height:20px;color:${EMAIL_BRAND.mid};word-break:break-all;text-decoration:underline">
                      ${escapeHtml(input.action.url)}
                    </a>
                  </td>
                </tr>
    `
    : "";

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <meta name="color-scheme" content="light">
        <title>${escapedTitle}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');

          h1,h2,.brand-font {
            font-family:${BRAND_FONT_STACK}!important;
          }
        </style>
      </head>
      <body style="margin:0;padding:0;background:${EMAIL_BRAND.background};font-family:${EMAIL_FONT_STACK};color:${EMAIL_BRAND.text};-webkit-text-size-adjust:100%;text-size-adjust:100%">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
          ${escapedPreheader}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${EMAIL_BRAND.background}">
          <tr>
            <td align="center" style="padding:40px 14px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:${EMAIL_BRAND.surface};border:1px solid ${EMAIL_BRAND.border};border-radius:24px;overflow:hidden">
                <tr>
                  <td style="background:${EMAIL_BRAND.ink};padding:30px 34px">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align:middle">
                          <img src="${escapeHtml(
                            logoUrl
                          )}" width="155" alt="${escapeHtml(
                            app
                          )}" style="display:block;width:155px;max-width:155px;height:auto;border:0;outline:none;text-decoration:none">
                        </td>
                        <td align="right" style="vertical-align:middle">
                          <div style="font-size:13px;line-height:20px;font-weight:600;color:rgba(246,241,235,.7)">
                            ${escapedEyebrow}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:34px">
                    <div style="background:${EMAIL_BRAND.panel};border-radius:18px;padding:42px 30px;text-align:center">
                      <div style="width:54px;height:54px;margin:auto auto 22px;border-radius:50%;background:${EMAIL_BRAND.paleMint};line-height:54px;font-size:24px;color:${EMAIL_BRAND.ink}">
                        &#9993;
                      </div>
                      <h1 class="brand-font" style="margin:0 0 18px;font-family:${BRAND_FONT_STACK};font-size:32px;line-height:40px;font-weight:800;letter-spacing:0;color:${EMAIL_BRAND.ink}">
                        ${escapedTitle}
                      </h1>
                      <div style="margin:0 auto 28px;max-width:430px;font-size:15px;line-height:25px;color:${EMAIL_BRAND.bodyText}">
                        ${input.bodyHtml}
                      </div>
                      ${actionHtml}
                    </div>
                  </td>
                </tr>
                ${fallbackHtml}
                <tr>
                  <td style="padding:0 34px 34px">
                    <div style="height:1px;background:${EMAIL_BRAND.border};margin-bottom:22px"></div>
                    ${footerNote}
                    <p class="brand-font" style="margin:0 0 8px;font-family:${BRAND_FONT_STACK};font-size:15px;line-height:20px;font-weight:700;color:${EMAIL_BRAND.ink}">
                      ${escapeHtml(app)}
                    </p>
                    <p style="margin:0;font-size:12px;line-height:19px;color:${EMAIL_BRAND.softMuted}">
                      Beautiful digital guidebooks, faster guest replies, and smoother stays for modern hosts.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function renderEmailQuote(text: string) {
  const escapedText = escapeHtml(text.trim()).replaceAll("\n", "<br>");

  return `
    <div style="margin:20px 0;padding:16px 18px;border:1px solid #CFF6DC;border-left:4px solid ${EMAIL_BRAND.mint};background:${EMAIL_BRAND.paleMint};border-radius:10px;color:${EMAIL_BRAND.ink};font-size:15px;line-height:23px">
      ${escapedText}
    </div>
  `;
}

async function sendResendEmail(input: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("Skipping email send: RESEND_API_KEY is not set");
    return { skipped: true };
  }
  const from = emailFrom("resend");

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: from.raw,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend email failed (${response.status}): ${body}`);
  }

  return { skipped: false };
}

async function sendBrevoEmail(input: SendEmailInput) {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    console.warn("Skipping email send: BREVO_API_KEY is not set");
    return { skipped: true };
  }
  const from = emailFrom("brevo");

  const response = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: from.parsed,
      to: [{ email: input.to }],
      subject: input.subject,
      htmlContent: input.html,
      textContent: input.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Brevo email failed (${response.status}): ${body}`);
  }

  return { skipped: false };
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
