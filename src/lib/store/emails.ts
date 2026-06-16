import {
  escapeHtml,
  renderBrandedEmail,
  renderEmailQuote,
  sendEmail,
} from "@/lib/email";
import { formatStoreMoney } from "@/lib/store/public";
import type { StoreRequestLine } from "@/lib/store/types";

function renderLines(lines: StoreRequestLine[]) {
  return lines
    .map(
      (line) => `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #DDE8EC;color:#042129;font-size:14px;line-height:20px">
            ${escapeHtml(line.itemName)}
            <span style="color:#6B7C85">x ${line.quantity}</span>
          </td>
          <td align="right" style="padding:10px 14px;border-bottom:1px solid #DDE8EC;color:#042129;font-size:14px;line-height:20px">
            ${escapeHtml(formatStoreMoney(line.lineTotalCents, line.currency))}
          </td>
        </tr>
      `
    )
    .join("");
}

export async function sendStoreRequestEmail(input: {
  to: string;
  guidebookTitle: string;
  guestName: string;
  requestCode: string;
  subtotalCents: number;
  currency: string;
  lines: StoreRequestLine[];
  dashboardUrl: string;
}) {
  const subtotalLabel = formatStoreMoney(input.subtotalCents, input.currency);
  const guestName = input.guestName.trim() || "A guest";
  const html = renderBrandedEmail({
    preheader: `${guestName} submitted a Store request.`,
    eyebrow: "New Store request",
    title: `New Store request for ${input.guidebookTitle}`,
    bodyHtml: `
      <p style="margin:0 0 16px">${escapeHtml(
        guestName
      )} submitted request ${escapeHtml(input.requestCode)}.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0 20px;background:#FBFDFE;border:1px solid #DDE8EC;border-radius:12px;color:#042129">
        ${renderLines(input.lines)}
        <tr>
          <td style="padding:14px 14px 12px;font-weight:800;color:#042129">Subtotal</td>
          <td align="right" style="padding:14px 14px 12px;font-weight:800;color:#042129">${escapeHtml(
            subtotalLabel
          )}</td>
        </tr>
      </table>
      <p style="margin:0">Open the Store dashboard to update the request or reply to the guest.</p>
    `,
    action: {
      label: "Open Store request",
      url: input.dashboardUrl,
    },
  });

  await sendEmail({
    to: input.to,
    subject: `New Store request for ${input.guidebookTitle}`,
    html,
    text: `${guestName} submitted Store request ${input.requestCode} for ${input.guidebookTitle} (${subtotalLabel}).\n\nOpen it: ${input.dashboardUrl}`,
  });
}

export async function sendStoreGuestRequestConfirmationEmail(input: {
  to: string;
  guidebookTitle: string;
  guestName: string;
  requestCode: string;
  subtotalCents: number;
  currency: string;
  lines: StoreRequestLine[];
  resumeUrl: string;
}) {
  const subtotalLabel = formatStoreMoney(input.subtotalCents, input.currency);
  const guestName = input.guestName.trim() || "there";
  const html = renderBrandedEmail({
    preheader: `Your Store request ${input.requestCode} was sent.`,
    eyebrow: "Store request sent",
    title: `We sent your Store request for ${input.guidebookTitle}`,
    bodyHtml: `
      <p style="margin:0 0 16px">Hi ${escapeHtml(guestName)},</p>
      <p style="margin:0 0 16px">Your request ${escapeHtml(
        input.requestCode
      )} has been sent to the host.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0 20px;background:#FBFDFE;border:1px solid #DDE8EC;border-radius:12px;color:#042129">
        ${renderLines(input.lines)}
        <tr>
          <td style="padding:14px 14px 12px;font-weight:800;color:#042129">Subtotal</td>
          <td align="right" style="padding:14px 14px 12px;font-weight:800;color:#042129">${escapeHtml(
            subtotalLabel
          )}</td>
        </tr>
      </table>
      <p style="margin:0">Open the request any time to check status or message your host.</p>
    `,
    action: {
      label: "Open Store request",
      url: input.resumeUrl,
    },
  });

  return sendEmail({
    to: input.to,
    subject: `Store request ${input.requestCode} sent`,
    html,
    text: `Hi ${guestName},\n\nYour Store request ${input.requestCode} for ${input.guidebookTitle} was sent (${subtotalLabel}).\n\nOpen the request: ${input.resumeUrl}`,
  });
}

export async function sendStoreHostReplyEmail(input: {
  to: string;
  guidebookTitle: string;
  guestName: string | null;
  message: string;
  resumeUrl: string;
}) {
  const guestName = input.guestName?.trim() || "there";
  const hostMessage = input.message.trim();
  const html = renderBrandedEmail({
    preheader: `Your host replied about your Store request.`,
    eyebrow: "Store request reply",
    title: `Your host replied about ${input.guidebookTitle}`,
    bodyHtml: `
      <p style="margin:0 0 16px">Hi ${escapeHtml(guestName)},</p>
      <p style="margin:0 0 18px">Your host replied to your Store request.</p>
      ${renderEmailQuote(hostMessage)}
      <p style="margin:0">Open the request to reply or check the latest status.</p>
    `,
    action: {
      label: "Open Store request",
      url: input.resumeUrl,
    },
  });

  await sendEmail({
    to: input.to,
    subject: `Your host replied about ${input.guidebookTitle}`,
    html,
    text: `Hi ${guestName},\n\nYour host replied to your Store request:\n\n"${hostMessage}"\n\nOpen the request: ${input.resumeUrl}`,
  });
}

export async function sendStoreGuestReplyEmail(input: {
  to: string;
  guidebookTitle: string;
  guestName: string | null;
  message: string;
  dashboardUrl: string;
}) {
  const guestName = input.guestName?.trim() || "A guest";
  const guestMessage = input.message.trim();
  const html = renderBrandedEmail({
    preheader: `${guestName} replied to a Store request.`,
    eyebrow: "Store request reply",
    title: `New Store message for ${input.guidebookTitle}`,
    bodyHtml: `
      <p style="margin:0 0 18px">${escapeHtml(
        guestName
      )} replied to their Store request.</p>
      ${renderEmailQuote(guestMessage)}
      <p style="margin:0">Open the Store request to read it and reply.</p>
    `,
    action: {
      label: "Open Store request",
      url: input.dashboardUrl,
    },
  });

  await sendEmail({
    to: input.to,
    subject: `New Store message for ${input.guidebookTitle}`,
    html,
    text: `${guestName} replied to their Store request:\n\n"${guestMessage}"\n\nOpen it: ${input.dashboardUrl}`,
  });
}

export async function sendStorePaymentProofSubmittedEmail(input: {
  to: string;
  guidebookTitle: string;
  guestName: string | null;
  requestCode: string;
  dashboardUrl: string;
}) {
  const guestName = input.guestName?.trim() || "A guest";
  const html = renderBrandedEmail({
    preheader: `${guestName} submitted payment proof.`,
    eyebrow: "Payment proof submitted",
    title: `Payment proof for ${input.guidebookTitle}`,
    bodyHtml: `
      <p style="margin:0 0 16px">${escapeHtml(
        guestName
      )} submitted payment proof for request ${escapeHtml(
        input.requestCode
      )}.</p>
      <p style="margin:0">Open the Store request to review the proof and confirm payment.</p>
    `,
    action: {
      label: "Review payment proof",
      url: input.dashboardUrl,
    },
  });

  await sendEmail({
    to: input.to,
    subject: `Payment proof submitted for ${input.requestCode}`,
    html,
    text: `${guestName} submitted payment proof for Store request ${input.requestCode}.\n\nReview it: ${input.dashboardUrl}`,
  });
}

export async function sendStoreGuestProgressEmail(input: {
  to: string;
  guidebookTitle: string;
  guestName: string | null;
  requestCode: string;
  resumeUrl: string;
  event: "approved" | "payment_confirmed" | "fulfilled" | "cancelled";
  paymentRequired?: boolean;
}) {
  const guestName = input.guestName?.trim() || "there";
  const copy = {
    approved: {
      eyebrow: "Store request approved",
      title: `Your Store request was approved`,
      subject: `Store request ${input.requestCode} approved`,
      body: input.paymentRequired === false
        ? "Your host approved the request. No payment is required, and the host will handle the next step."
        : "Your host approved the request. Payment details are now available on the request page.",
      action: "Open request",
    },
    payment_confirmed: {
      eyebrow: "Payment confirmed",
      title: `Your Store payment was confirmed`,
      subject: `Payment confirmed for ${input.requestCode}`,
      body: "Your host confirmed the payment proof. The request is ready for delivery.",
      action: "Check status",
    },
    fulfilled: {
      eyebrow: "Store request delivered",
      title: `Your Store request was delivered`,
      subject: `Store request ${input.requestCode} delivered`,
      body: "Your host marked this Store request as delivered.",
      action: "View request",
    },
    cancelled: {
      eyebrow: "Store request cancelled",
      title: `Your Store request was cancelled`,
      subject: `Store request ${input.requestCode} cancelled`,
      body: "Your host cancelled this Store request. Open the request if you need to message them.",
      action: "Open request",
    },
  }[input.event];

  const html = renderBrandedEmail({
    preheader: copy.body,
    eyebrow: copy.eyebrow,
    title: copy.title,
    bodyHtml: `
      <p style="margin:0 0 16px">Hi ${escapeHtml(guestName)},</p>
      <p style="margin:0 0 16px">${escapeHtml(copy.body)}</p>
      <p style="margin:0">Request ${escapeHtml(
        input.requestCode
      )} is for ${escapeHtml(input.guidebookTitle)}.</p>
    `,
    action: {
      label: copy.action,
      url: input.resumeUrl,
    },
  });

  await sendEmail({
    to: input.to,
    subject: copy.subject,
    html,
    text: `Hi ${guestName},\n\n${copy.body}\n\nOpen the request: ${input.resumeUrl}`,
  });
}
