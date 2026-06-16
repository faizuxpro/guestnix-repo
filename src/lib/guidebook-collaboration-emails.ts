import { absoluteAppUrl } from "@/lib/app-url";
import { escapeHtml, renderBrandedEmail, sendEmail } from "@/lib/email";

type CollaborationEmailInput = {
  to: string;
  guidebookTitle: string;
  inviterName: string | null;
  token: string;
};

export async function sendGuidebookInvitationEmail(input: CollaborationEmailInput) {
  const acceptUrl = absoluteAppUrl(`/guidebook-invitations/${input.token}`);
  const inviter = input.inviterName?.trim() || "A Guestnix host";
  const html = renderBrandedEmail({
    preheader: `${inviter} invited you to edit ${input.guidebookTitle}.`,
    eyebrow: "Guidebook invitation",
    title: "You have been invited to edit a guidebook",
    bodyHtml: `
      <p style="margin:0 0 14px">${escapeHtml(inviter)} invited you to collaborate on <strong>${escapeHtml(
        input.guidebookTitle
      )}</strong>.</p>
      <p style="margin:0">Accept the invitation to open the guidebook editor. This link expires in 7 days.</p>
    `,
    action: { label: "Accept invitation", url: acceptUrl },
  });

  return sendEmail({
    to: input.to,
    subject: `Edit ${input.guidebookTitle} on Guestnix`,
    html,
    text: `${inviter} invited you to edit "${input.guidebookTitle}" on Guestnix. Accept: ${acceptUrl}`,
  });
}

export async function sendOwnershipTransferEmail(input: CollaborationEmailInput) {
  const acceptUrl = absoluteAppUrl(`/ownership-transfers/${input.token}`);
  const inviter = input.inviterName?.trim() || "A Guestnix host";
  const html = renderBrandedEmail({
    preheader: `${inviter} wants to transfer ${input.guidebookTitle} to you.`,
    eyebrow: "Ownership transfer",
    title: "Review this guidebook ownership transfer",
    bodyHtml: `
      <p style="margin:0 0 14px">${escapeHtml(inviter)} wants to transfer ownership of <strong>${escapeHtml(
        input.guidebookTitle
      )}</strong> to your Guestnix account.</p>
      <p style="margin:0">Accept only if you expect to own and manage this guidebook. This link expires in 7 days.</p>
    `,
    action: { label: "Review transfer", url: acceptUrl },
  });

  return sendEmail({
    to: input.to,
    subject: `Ownership transfer for ${input.guidebookTitle}`,
    html,
    text: `${inviter} wants to transfer ownership of "${input.guidebookTitle}" to you. Review: ${acceptUrl}`,
  });
}
