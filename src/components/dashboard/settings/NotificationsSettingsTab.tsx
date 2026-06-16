"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, BellRing, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PermissionState = NotificationPermission | "unsupported";

function getPermission(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

function permissionLabel(permission: PermissionState) {
  if (permission === "granted") return "Enabled";
  if (permission === "denied") return "Blocked";
  if (permission === "unsupported") return "Unsupported";
  return "Not enabled";
}

export function NotificationsSettingsTab() {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPermission(getPermission());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function requestNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      toast.error("Browser notifications are not supported here.");
      return;
    }

    setRequesting(true);
    const next = await Notification.requestPermission();
    setPermission(next);
    setRequesting(false);

    if (next === "granted") {
      toast.success("Inbox notifications enabled.");
      showTestNotification();
      return;
    }

    if (next === "denied") {
      toast.error("Notifications are blocked in your browser settings.");
      return;
    }

    toast.message("Notifications were not enabled.");
  }

  function showTestNotification() {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      toast.error("Enable notifications before sending a test.");
      return;
    }

    try {
      new Notification("Guestnix notifications are on", {
        body: "You can receive browser alerts for new inbox activity.",
        tag: "guestnix-settings-notification-test",
      });
    } catch {
      toast.error("Your browser blocked the test notification.");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" />
            Browser notifications
          </CardTitle>
          <CardDescription>
            Enable desktop alerts for inbox activity while you are working in
            Guestnix.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4">
            <div>
              <p className="text-sm font-medium">Current permission</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Controlled by this browser and device.
              </p>
            </div>
            <Badge
              variant={permission === "granted" ? "default" : "outline"}
              className="capitalize"
            >
              {permissionLabel(permission)}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={requestNotifications}
              disabled={requesting || permission === "unsupported"}
            >
              {requesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <BellRing className="mr-2 h-4 w-4" />
              )}
              Enable notifications
            </Button>
            <Button
              variant="outline"
              onClick={showTestNotification}
              disabled={permission !== "granted"}
            >
              Send test
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inbox alerts</CardTitle>
          <CardDescription>
            Message-specific alert behavior is managed from your inbox.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full justify-between"
            render={<Link href="/dashboard/messages" />}
          >
            Open Messages
            <ExternalLink className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
