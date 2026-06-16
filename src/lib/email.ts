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

const EMAIL_BRAND = {
  ink: "#042129",
  mid: "#0A3D4D",
  mint: "#6FEF8B",
  paleMint: "#ECFFF5",
  cream: "#F6F1EB",
  background: "#F4F7F8",
  surface: "#FFFFFF",
  surfaceLow: "#FBFDFE",
  border: "#DDE8EC",
  text: "#042129",
  bodyText: "#39505A",
  muted: "#6B7C85",
  softMuted: "#8AA0A9",
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
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 18px">
        <tr>
          <td bgcolor="${EMAIL_BRAND.ink}" style="border-radius:10px">
            <a href="${escapeHtml(input.action.url)}" style="display:inline-block;padding:14px 22px;font-size:15px;font-weight:800;line-height:20px;color:${EMAIL_BRAND.mint};text-decoration:none;border-radius:10px">
              ${escapeHtml(input.action.label)}
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 4px;font-size:13px;line-height:20px;color:${EMAIL_BRAND.muted}">Button not working? Open this secure link:</p>
      <p style="margin:0 0 22px;font-size:13px;line-height:20px;word-break:break-all">
        <a href="${escapeHtml(input.action.url)}" style="color:${EMAIL_BRAND.mid};text-decoration:underline">${escapeHtml(
          input.action.url
        )}</a>
      </p>
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
      </head>
      <body style="margin:0;padding:0;background:${EMAIL_BRAND.background};font-family:${EMAIL_FONT_STACK};color:${EMAIL_BRAND.text};-webkit-text-size-adjust:100%;text-size-adjust:100%">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
          ${escapedPreheader}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${EMAIL_BRAND.background}">
          <tr>
            <td align="center" style="padding:36px 14px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:${EMAIL_BRAND.surface};border:1px solid ${EMAIL_BRAND.border};border-radius:18px;overflow:hidden">
                <tr>
                  <td style="padding:0;background:${EMAIL_BRAND.ink}">
                    <div style="height:4px;background:${EMAIL_BRAND.mint};font-size:1px;line-height:4px">&nbsp;</div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:26px 30px 22px;vertical-align:middle">
                          <img src="${escapeHtml(
                            logoUrl
                          )}" width="150" height="41" alt="${escapeHtml(
                            app
                          )}" style="display:block;width:150px;max-width:150px;height:auto;border:0;outline:none;text-decoration:none">
                          <p style="margin:14px 0 0;color:rgba(246,241,235,0.72);font-size:13px;line-height:20px;font-weight:600">
                            Digital guidebooks and guest workflows, beautifully handled.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:36px 32px 14px">
                    <p style="display:inline-block;margin:0 0 14px;padding:6px 10px;border-radius:999px;background:${EMAIL_BRAND.paleMint};color:${EMAIL_BRAND.mid};font-size:12px;font-weight:800;line-height:16px;letter-spacing:0;text-transform:none">${escapedEyebrow}</p>
                    <h1 style="margin:0 0 18px;color:${EMAIL_BRAND.ink};font-size:28px;line-height:35px;font-weight:800;letter-spacing:0">${escapedTitle}</h1>
                    <div style="font-size:15px;line-height:25px;color:${EMAIL_BRAND.bodyText}">
                      ${input.bodyHtml}
                    </div>
                    ${actionHtml}
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 32px 32px">
                    <div style="height:1px;background:${EMAIL_BRAND.border};margin:8px 0 20px"></div>
                    ${footerNote}
                    <p style="margin:0 0 6px;font-size:12px;line-height:18px;color:${EMAIL_BRAND.ink};font-weight:800">
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
