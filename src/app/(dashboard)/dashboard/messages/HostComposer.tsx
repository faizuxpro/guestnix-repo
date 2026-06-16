"use client";

import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mail, Send } from "lucide-react";

type Props = {
  disabled?: boolean;
  sending?: boolean;
  canEmailResumeLink?: boolean;
  defaultSendResumeLinkEmail?: boolean;
  onSend: (content: string, options: { sendResumeLinkEmail: boolean }) => void;
};

export function HostComposer({
  disabled,
  sending = false,
  canEmailResumeLink = false,
  defaultSendResumeLinkEmail = false,
  onSend,
}: Props) {
  const [value, setValue] = useState("");
  const [sendResumeLinkEmail, setSendResumeLinkEmail] = useState(
    canEmailResumeLink && defaultSendResumeLinkEmail
  );

  const send = () => {
    if (disabled || sending) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed, { sendResumeLinkEmail: canEmailResumeLink && sendResumeLinkEmail });
    setValue("");
    setSendResumeLinkEmail(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      send();
    }
  };

  return (
    <div className="shrink-0 border-t bg-background p-3">
      <div className="rounded-lg border bg-muted/25 p-2 focus-within:border-primary/40 focus-within:bg-background">
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Reply to guest... (Ctrl/Cmd + Enter)"
          rows={2}
          disabled={disabled || sending}
          className="max-h-28 min-h-14 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <div className="mt-2 flex items-center justify-between gap-3 border-t pt-2">
          {canEmailResumeLink ? (
            <label
              htmlFor="send-resume-link-email"
              className="flex min-w-0 items-center gap-2 rounded-md px-1 py-1 text-xs leading-tight text-muted-foreground"
            >
              <Checkbox
                id="send-resume-link-email"
                checked={sendResumeLinkEmail}
                disabled={disabled || sending}
                className="size-5 border-2 border-primary/70 bg-background shadow-sm shadow-primary/10 data-checked:border-primary data-checked:bg-primary data-checked:shadow-primary/20 [&_[data-slot=checkbox-indicator]>svg]:size-4"
                onCheckedChange={(value) => setSendResumeLinkEmail(value === true)}
              />
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0">
                Send a chat link by email if the guest becomes unresponsive.
              </span>
            </label>
          ) : (
            <span className="text-xs text-muted-foreground">
              Guest email not available
            </span>
          )}
          <Button
            onClick={send}
            disabled={disabled || sending || !value.trim()}
            size="icon"
            aria-label={sending ? "Sending reply" : "Send reply"}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>{sending ? "Sending reply..." : "Ctrl/Cmd + Enter to send"}</span>
      </div>
    </div>
  );
}
