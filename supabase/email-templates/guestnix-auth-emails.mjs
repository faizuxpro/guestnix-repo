import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_APP_URL = "https://guestnix.com";
const APP_URL_ARG = "--app-url=";
const OUT_DIR_ARG = "--out-dir=";
const BRAND_LOGO_PATH = "/brand/Guestnix full logo (for dark bg).svg";
const EMAIL_FONT_STACK =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";

const BRAND = {
  ink: "#042129",
  mid: "#0A3D4D",
  mint: "#6FEF8B",
  paleMint: "#ECFFF5",
  cream: "#F6F1EB",
  background: "#F4F7F8",
  surface: "#FFFFFF",
  border: "#DDE8EC",
  bodyText: "#39505A",
  muted: "#6B7C85",
  softMuted: "#8AA0A9",
};

function valueFromArg(prefix) {
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function appUrlFromArgs() {
  return valueFromArg(APP_URL_ARG);
}

function outDirFromArgs() {
  return valueFromArg(OUT_DIR_ARG);
}

function normalizeOrigin(value) {
  const trimmed = value?.trim().replace(/\/+$/, "");
  if (!trimmed) return DEFAULT_APP_URL;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return DEFAULT_APP_URL;
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const appUrl = normalizeOrigin(appUrlFromArgs());

const settingsUrl = `${appUrl}/dashboard/settings`;

function isLocalOrigin(origin) {
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

function emailAssetUrl(path) {
  const assetOrigin = isLocalOrigin(appUrl) ? DEFAULT_APP_URL : appUrl;
  return new URL(path, assetOrigin).toString();
}

const brandLogoUrl = emailAssetUrl(BRAND_LOGO_PATH);

function button(label, href) {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 16px">
      <tr>
        <td bgcolor="${BRAND.ink}" style="border-radius:10px">
          <a href="${href}" style="display:inline-block;padding:14px 22px;font-size:15px;font-weight:800;line-height:20px;color:${BRAND.mint};text-decoration:none;border-radius:10px">
            ${label}
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 4px;font-size:13px;line-height:20px;color:${BRAND.muted}">Button not working? Open this secure link:</p>
    <p style="margin:0 0 22px;font-size:13px;line-height:20px;word-break:break-all">
      <a href="${href}" style="color:${BRAND.mid};text-decoration:underline">${href}</a>
    </p>
  `;
}

function codeBlock(code) {
  return `
    <div style="margin:24px 0;padding:18px 20px;border-radius:10px;background:${BRAND.paleMint};border:1px solid #CFF6DC;color:${BRAND.ink};font-size:32px;line-height:40px;font-weight:800;letter-spacing:8px;text-align:center">
      ${code}
    </div>
  `;
}

function layout({ preheader, eyebrow, title, body, cta }) {
  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <meta name="color-scheme" content="light">
        <title>${title}</title>
      </head>
      <body style="margin:0;padding:0;background:${BRAND.background};font-family:${EMAIL_FONT_STACK};color:${BRAND.ink};-webkit-text-size-adjust:100%;text-size-adjust:100%">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${preheader}</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BRAND.background}">
          <tr>
            <td align="center" style="padding:36px 14px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:18px;overflow:hidden">
                <tr>
                  <td style="padding:0;background:${BRAND.ink}">
                    <div style="height:4px;background:${BRAND.mint};font-size:1px;line-height:4px">&nbsp;</div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:26px 30px 22px;vertical-align:middle">
                          <img src="${brandLogoUrl}" width="150" height="41" alt="Guestnix" style="display:block;width:150px;max-width:150px;height:auto;border:0;outline:none;text-decoration:none">
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
                    <p style="display:inline-block;margin:0 0 14px;padding:6px 10px;border-radius:999px;background:${BRAND.paleMint};color:${BRAND.mid};font-size:12px;font-weight:800;line-height:16px;letter-spacing:0;text-transform:none">${eyebrow}</p>
                    <h1 style="margin:0 0 18px;color:${BRAND.ink};font-size:28px;line-height:35px;font-weight:800;letter-spacing:0">${title}</h1>
                    <div style="font-size:15px;line-height:25px;color:${BRAND.bodyText}">${body}</div>
                    ${cta ?? ""}
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 32px 32px">
                    <div style="height:1px;background:${BRAND.border};margin:8px 0 20px"></div>
                    <p style="margin:0 0 6px;font-size:12px;line-height:18px;color:${BRAND.ink};font-weight:800">
                      Guestnix
                    </p>
                    <p style="margin:0;font-size:12px;line-height:19px;color:${BRAND.softMuted}">
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
  `.trim();
}

function authBody(...paragraphs) {
  return paragraphs.map((text) => `<p style="margin:0 0 16px">${text}</p>`).join("");
}

export const authEmailConfig = {
  mailer_subjects_confirmation: "Confirm your Guestnix email",
  mailer_templates_confirmation_content: layout({
    preheader: "Confirm your email to start building your first digital guidebook.",
    eyebrow: "Confirm email",
    title: "Confirm your email",
    body: authBody(
      "Welcome to Guestnix. Confirm your email address to activate your account and start building your digital welcome guide.",
      "This link is single-use and expires automatically for your security."
    ),
    cta: button("Confirm email", "{{ .ConfirmationURL }}"),
  }),

  mailer_subjects_magic_link: "Your Guestnix sign-in link",
  mailer_templates_magic_link_content: layout({
    preheader: "Use this secure link to sign in to Guestnix.",
    eyebrow: "Magic link",
    title: "Sign in to Guestnix",
    body: authBody(
      "Use this secure link to sign in to your Guestnix account.",
      "If you did not request this email, you can safely ignore it."
    ),
    cta: button("Sign in", "{{ .ConfirmationURL }}"),
  }),

  mailer_subjects_recovery: "Reset your Guestnix password",
  mailer_templates_recovery_content: layout({
    preheader: "Choose a new password for your Guestnix account.",
    eyebrow: "Password reset",
    title: "Reset your password",
    body: authBody(
      "We received a request to reset the password for your Guestnix account.",
      "Use the link below to choose a new password. If you did not request this, no action is needed."
    ),
    cta: button("Reset password", "{{ .ConfirmationURL }}"),
  }),

  mailer_subjects_invite: "You have been invited to Guestnix",
  mailer_templates_invite_content: layout({
    preheader: "Accept your Guestnix invite and create your account.",
    eyebrow: "Invitation",
    title: "You have been invited",
    body: authBody(
      "You have been invited to join Guestnix.",
      "Accept the invitation to create your account and start collaborating."
    ),
    cta: button("Accept invitation", "{{ .ConfirmationURL }}"),
  }),

  mailer_subjects_email_change: "Confirm your new Guestnix email",
  mailer_templates_email_change_content: layout({
    preheader: "Confirm the new email address for your Guestnix account.",
    eyebrow: "Email change",
    title: "Confirm your new email",
    body: authBody(
      "Confirm <strong>{{ .NewEmail }}</strong> as the new email address for your Guestnix account.",
      "If you did not request this change, you can safely ignore this email."
    ),
    cta: button("Confirm new email", "{{ .ConfirmationURL }}"),
  }),

  mailer_subjects_reauthentication: "{{ .Token }} is your Guestnix verification code",
  mailer_templates_reauthentication_content: layout({
    preheader: "Use this code to verify your identity in Guestnix.",
    eyebrow: "Verification code",
    title: "Verify your identity",
    body:
      authBody("Use this one-time code to continue your secure Guestnix action.") +
      codeBlock("{{ .Token }}") +
      authBody("This code expires shortly. If you did not request it, you can ignore this email."),
  }),

  mailer_notifications_password_changed_enabled: true,
  mailer_subjects_password_changed_notification: "Your Guestnix password was changed",
  mailer_templates_password_changed_notification_content: layout({
    preheader: "The password on your Guestnix account was changed.",
    eyebrow: "Security notice",
    title: "Your password was changed",
    body: authBody(
      "The password for your Guestnix account was recently changed.",
      "If you made this change, no action is needed. If you did not, reset your password right away."
    ),
    cta: button("Review account", escapeHtml(settingsUrl)),
  }),

  mailer_notifications_email_changed_enabled: true,
  mailer_subjects_email_changed_notification: "Your Guestnix email was changed",
  mailer_templates_email_changed_notification_content: layout({
    preheader: "The email address on your Guestnix account was changed.",
    eyebrow: "Security notice",
    title: "Your email was changed",
    body: authBody(
      "The email address for your Guestnix account changed from <strong>{{ .OldEmail }}</strong> to <strong>{{ .Email }}</strong>.",
      "If you did not make this change, review your account immediately."
    ),
    cta: button("Review account", escapeHtml(settingsUrl)),
  }),

  mailer_notifications_phone_changed_enabled: true,
  mailer_subjects_phone_changed_notification: "Your Guestnix phone number was changed",
  mailer_templates_phone_changed_notification_content: layout({
    preheader: "The phone number on your Guestnix account was changed.",
    eyebrow: "Security notice",
    title: "Your phone number was changed",
    body: authBody(
      "The phone number for your Guestnix account changed from <strong>{{ .OldPhone }}</strong> to <strong>{{ .Phone }}</strong>.",
      "If you did not make this change, review your account immediately."
    ),
    cta: button("Review account", escapeHtml(settingsUrl)),
  }),

  mailer_notifications_mfa_factor_enrolled_enabled: true,
  mailer_subjects_mfa_factor_enrolled_notification:
    "A Guestnix verification method was added",
  mailer_templates_mfa_factor_enrolled_notification_content: layout({
    preheader: "A new verification method was added to your Guestnix account.",
    eyebrow: "Security notice",
    title: "A verification method was added",
    body: authBody(
      "A <strong>{{ .FactorType }}</strong> verification method was added to your Guestnix account.",
      "If you did not make this change, review your account immediately."
    ),
    cta: button("Review account", escapeHtml(settingsUrl)),
  }),

  mailer_notifications_mfa_factor_unenrolled_enabled: true,
  mailer_subjects_mfa_factor_unenrolled_notification:
    "A Guestnix verification method was removed",
  mailer_templates_mfa_factor_unenrolled_notification_content: layout({
    preheader: "A verification method was removed from your Guestnix account.",
    eyebrow: "Security notice",
    title: "A verification method was removed",
    body: authBody(
      "A <strong>{{ .FactorType }}</strong> verification method was removed from your Guestnix account.",
      "If you did not make this change, review your account immediately."
    ),
    cta: button("Review account", escapeHtml(settingsUrl)),
  }),

  mailer_notifications_identity_linked_enabled: true,
  mailer_subjects_identity_linked_notification:
    "A sign-in method was linked to Guestnix",
  mailer_templates_identity_linked_notification_content: layout({
    preheader: "A sign-in method was linked to your Guestnix account.",
    eyebrow: "Security notice",
    title: "A sign-in method was linked",
    body: authBody(
      "Your <strong>{{ .Provider }}</strong> account was linked as a sign-in method for <strong>{{ .Email }}</strong>.",
      "If you did not make this change, review your account immediately."
    ),
    cta: button("Review account", escapeHtml(settingsUrl)),
  }),

  mailer_notifications_identity_unlinked_enabled: true,
  mailer_subjects_identity_unlinked_notification:
    "A sign-in method was removed from Guestnix",
  mailer_templates_identity_unlinked_notification_content: layout({
    preheader: "A sign-in method was removed from your Guestnix account.",
    eyebrow: "Security notice",
    title: "A sign-in method was removed",
    body: authBody(
      "Your <strong>{{ .Provider }}</strong> account was removed as a sign-in method for <strong>{{ .Email }}</strong>.",
      "If you did not make this change, review your account immediately."
    ),
    cta: button("Review account", escapeHtml(settingsUrl)),
  }),
};

const DASHBOARD_TEMPLATES = [
  {
    file: "confirm-signup",
    label: "Confirm signup",
    subjectKey: "mailer_subjects_confirmation",
    htmlKey: "mailer_templates_confirmation_content",
  },
  {
    file: "magic-link",
    label: "Magic Link",
    subjectKey: "mailer_subjects_magic_link",
    htmlKey: "mailer_templates_magic_link_content",
  },
  {
    file: "reset-password",
    label: "Reset password / Recovery",
    subjectKey: "mailer_subjects_recovery",
    htmlKey: "mailer_templates_recovery_content",
  },
  {
    file: "invite-user",
    label: "Invite user",
    subjectKey: "mailer_subjects_invite",
    htmlKey: "mailer_templates_invite_content",
  },
  {
    file: "change-email",
    label: "Change email address",
    subjectKey: "mailer_subjects_email_change",
    htmlKey: "mailer_templates_email_change_content",
  },
  {
    file: "reauthentication",
    label: "Reauthentication",
    subjectKey: "mailer_subjects_reauthentication",
    htmlKey: "mailer_templates_reauthentication_content",
  },
  {
    file: "password-changed",
    label: "Password changed notification",
    subjectKey: "mailer_subjects_password_changed_notification",
    htmlKey: "mailer_templates_password_changed_notification_content",
  },
  {
    file: "email-changed",
    label: "Email address changed notification",
    subjectKey: "mailer_subjects_email_changed_notification",
    htmlKey: "mailer_templates_email_changed_notification_content",
  },
  {
    file: "phone-changed",
    label: "Phone number changed notification",
    subjectKey: "mailer_subjects_phone_changed_notification",
    htmlKey: "mailer_templates_phone_changed_notification_content",
  },
  {
    file: "verification-method-added",
    label: "Verification method added notification",
    subjectKey: "mailer_subjects_mfa_factor_enrolled_notification",
    htmlKey: "mailer_templates_mfa_factor_enrolled_notification_content",
  },
  {
    file: "verification-method-removed",
    label: "Verification method removed notification",
    subjectKey: "mailer_subjects_mfa_factor_unenrolled_notification",
    htmlKey: "mailer_templates_mfa_factor_unenrolled_notification_content",
  },
  {
    file: "signin-method-linked",
    label: "Sign-in method linked notification",
    subjectKey: "mailer_subjects_identity_linked_notification",
    htmlKey: "mailer_templates_identity_linked_notification_content",
  },
  {
    file: "signin-method-removed",
    label: "Sign-in method removed notification",
    subjectKey: "mailer_subjects_identity_unlinked_notification",
    htmlKey: "mailer_templates_identity_unlinked_notification_content",
  },
];

function writeDashboardFiles(outDir) {
  mkdirSync(outDir, { recursive: true });

  const lines = [
    "Guestnix Supabase Auth email dashboard files",
    "",
    `App URL used in account/security links: ${appUrl}`,
    "",
    "For each Supabase template, paste the .subject.txt file into Subject and the .html file into Message body.",
    "",
  ];

  for (const template of DASHBOARD_TEMPLATES) {
    const subject = authEmailConfig[template.subjectKey];
    const html = authEmailConfig[template.htmlKey];
    writeFileSync(join(outDir, `${template.file}.subject.txt`), `${subject}\n`);
    writeFileSync(join(outDir, `${template.file}.html`), `${html}\n`);

    lines.push(
      `${template.label}:`,
      `  Subject: ${template.file}.subject.txt`,
      `  HTML:    ${template.file}.html`,
      ""
    );
  }

  writeFileSync(join(outDir, "README.txt"), `${lines.join("\n")}\n`);
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("guestnix-auth-emails.mjs")) {
  const outDir = outDirFromArgs();
  if (outDir) {
    writeDashboardFiles(outDir);
    console.log(`Wrote Supabase dashboard email files to ${outDir}`);
  } else {
    console.log(JSON.stringify(authEmailConfig, null, 2));
  }
}
