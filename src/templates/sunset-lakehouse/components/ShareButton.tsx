"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { HostIcon } from "@/components/icons/HostIcon";
import { editorInspectAttributes } from "@/lib/editor-inspect";

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean;
}>;

const FacebookIcon: IconComponent = (props) => (
  <Icon icon="tabler:brand-facebook" {...props} />
);
const WhatsappIcon: IconComponent = (props) => (
  <Icon icon="tabler:brand-whatsapp" {...props} />
);
const TwitterIcon: IconComponent = (props) => (
  <Icon icon="tabler:brand-x" {...props} />
);
const TelegramIcon: IconComponent = (props) => (
  <Icon icon="tabler:brand-telegram" {...props} />
);
const LinkedInIcon: IconComponent = (props) => (
  <Icon icon="tabler:brand-linkedin" {...props} />
);
const EmailIcon: IconComponent = (props) => (
  <Icon icon="tabler:mail" {...props} />
);
const SmsIcon: IconComponent = (props) => (
  <Icon icon="tabler:message" {...props} />
);
const LinkIcon: IconComponent = (props) => (
  <Icon icon="tabler:link" {...props} />
);
const CheckIcon: IconComponent = (props) => (
  <Icon icon="tabler:check" {...props} />
);
const CopyIcon: IconComponent = (props) => (
  <Icon icon="tabler:copy" {...props} />
);
const CloseIcon: IconComponent = (props) => (
  <Icon icon="tabler:x" {...props} />
);

function buildDefaultShareMessage(url: string) {
  return `Welcome, My Guest! 🏡✨

Your stay is confirmed—now let's make it smooth and special.
Tap below to open your Welcome Guidebook:

📖 ${url}

Inside, you'll find everything you need to feel right at home:

🛠️ Easy-to-follow house instructions

🌟 Our favorite local tips & hidden gems

🛋️ Details on all the features & amenities

🍽️ Food recommendations, things to do, and more!

Take a few minutes to explore—it'll help you settle in faster and discover the best of what's around.

We hope you have a fantastic stay. If you need anything, we're just a message away! 💬

Welcome home!
— Your Host`;
}

type Props = {
  /** Title used by share targets that support a subject/title field. */
  title: string;
  /** Optional legacy short description; kept for existing callers. */
  text?: string;
  /** Optional URL to share instead of the current page URL. */
  shareUrl?: string;
  /** Optional custom icon for the topbar share trigger. */
  icon?: string;
  /** Fired with "native" or "copy" when a share completes successfully. */
  onShared?: (method: "native" | "copy") => void;
};

type ShareTarget =
  | { id: string; label: string; Icon: IconComponent; href: string }
  | { id: "copy-link"; label: string; Icon: IconComponent; copyLink: true };

export function ShareButton({ title, shareUrl, icon, onShared }: Props) {
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState<"message" | "link" | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const markCopied = useCallback((kind: "message" | "link") => {
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    setCopied(kind);
    copiedTimerRef.current = setTimeout(() => setCopied(null), 1800);
  }, []);

  const handleShare = useCallback(() => {
    if (typeof window === "undefined") return;

    const currentUrl = shareUrl || window.location.href;
    const templateRoot =
      triggerRef.current?.closest<HTMLElement>(".tpl-sunset") ?? null;

    setPortalRoot(templateRoot);
    setUrl(currentUrl);
    setMessage(buildDefaultShareMessage(currentUrl));
    setCopied(null);
    setOpen(true);
  }, [shareUrl]);

  const copyValue = useCallback(
    async (value: string, kind: "message" | "link") => {
      try {
        await navigator.clipboard.writeText(value);
        markCopied(kind);
        onShared?.("copy");
      } catch {
        // Clipboard write blocked; the editable message/link remains visible.
      }
    },
    [markCopied, onShared]
  );

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedMessage = encodeURIComponent(message);

  const shareTargets: ShareTarget[] = [
    {
      id: "whatsapp",
      label: "WhatsApp",
      Icon: WhatsappIcon,
      href: `https://wa.me/?text=${encodedMessage}`,
    },
    {
      id: "telegram",
      label: "Telegram",
      Icon: TelegramIcon,
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}`,
    },
    {
      id: "email",
      label: "Email",
      Icon: EmailIcon,
      href: `mailto:?subject=${encodedTitle}&body=${encodedMessage}`,
    },
    {
      id: "sms",
      label: "SMS",
      Icon: SmsIcon,
      href: `sms:?&body=${encodedMessage}`,
    },
    {
      id: "copy-link",
      label: copied === "link" ? "Link copied" : "Copy Link",
      Icon: copied === "link" ? CheckIcon : LinkIcon,
      copyLink: true,
    },
    {
      id: "facebook",
      label: "Facebook",
      Icon: FacebookIcon,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedMessage}`,
    },
    {
      id: "twitter",
      label: "Twitter",
      Icon: TwitterIcon,
      href: `https://twitter.com/intent/tweet?text=${encodedMessage}`,
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      Icon: LinkedInIcon,
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}&summary=${encodedMessage}`,
    },
  ];

  const shareDialog = open ? (
    <div
      className="sl-share-backdrop"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Share this guidebook"
    >
      <div className="sl-share-sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sl-share-head">
          <h3>Share Welcome Guide</h3>
          <button
            type="button"
            className="sl-share-close"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <CloseIcon aria-hidden />
          </button>
        </header>

        <div className="sl-share-message-field">
          <label htmlFor="sl-share-message" className="sl-share-label">
            Share Message:
          </label>
          <textarea
            id="sl-share-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            aria-label="Editable share message"
            className="sl-share-message"
          />
          <button
            type="button"
            onClick={() => void copyValue(message, "message")}
            className={`sl-share-copy${
              copied === "message" ? " is-copied" : ""
            }`}
          >
            {copied === "message" ? (
              <CheckIcon aria-hidden />
            ) : (
              <CopyIcon aria-hidden />
            )}
            <span>{copied === "message" ? "Copied" : "Copy Message"}</span>
          </button>
        </div>

        <h4 className="sl-share-subhead">Share via:</h4>
        <div className="sl-share-grid">
          {shareTargets.map((target) =>
            "copyLink" in target ? (
              <button
                key={target.id}
                type="button"
                className={`sl-share-target sl-share-target-button${
                  copied === "link" ? " is-copied" : ""
                }`}
                onClick={() => void copyValue(url, "link")}
              >
                <target.Icon aria-hidden />
                <span>{target.label}</span>
              </button>
            ) : (
              <a
                key={target.id}
                href={target.href}
                target="_blank"
                rel="noreferrer noopener"
                className="sl-share-target"
                onClick={() => setOpen(false)}
              >
                <target.Icon aria-hidden />
                <span>{target.label}</span>
              </a>
            )
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="sl-share-btn"
        onClick={handleShare}
        aria-label="Share this guidebook"
        {...editorInspectAttributes(
          { kind: "navigation", focus: "share" },
          "Edit share"
        )}
      >
        <HostIcon value={icon} fallbackIconifyId="tabler:share-3" />
      </button>

      {shareDialog && portalRoot ? createPortal(shareDialog, portalRoot) : null}
    </>
  );
}
