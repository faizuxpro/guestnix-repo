"use client";

import { useMemo, useRef, useState } from "react";
import { Loader2, Mail, Trash2, UploadCloud, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-fetch";
import { uploadMediaFile } from "@/lib/media-upload-client";
import { toastApiError } from "@/lib/toast-error";
import { getInitials } from "@/lib/utils";
import type { ProfileSettingsData } from "./types";

type ProfileUpdateEvent = {
  full_name: string | null;
  avatar_url: string | null;
};

function emitProfileUpdate(detail: ProfileUpdateEvent) {
  window.dispatchEvent(
    new CustomEvent<ProfileUpdateEvent>("guestnix:profile-updated", {
      detail,
    })
  );
}

export function ProfileSettingsTab({
  initialProfile,
}: {
  initialProfile: ProfileSettingsData;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [savedProfile, setSavedProfile] = useState(initialProfile);
  const [fullName, setFullName] = useState(initialProfile.fullName ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    initialProfile.avatarUrl
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const trimmedName = fullName.trim();
  const dirty = useMemo(
    () =>
      trimmedName !== (savedProfile.fullName ?? "") ||
      avatarUrl !== savedProfile.avatarUrl,
    [avatarUrl, savedProfile.avatarUrl, savedProfile.fullName, trimmedName]
  );

  async function uploadAvatar(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }

    setUploading(true);
    setUploadProgress(1);

    try {
      const result = await uploadMediaFile(file, {
        onProgress: setUploadProgress,
      });
      setAvatarUrl(result.url);
      toast.success("Avatar uploaded to Media");
    } catch (err) {
      toast.error("Couldn't upload avatar", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setUploading(false);
      window.setTimeout(() => setUploadProgress(0), 400);
    }
  }

  async function saveProfile() {
    setSaving(true);
    const result = await apiFetch<ProfileSettingsData>(
      "/api/dashboard/settings/profile",
      {
        method: "PATCH",
        body: {
          fullName: trimmedName.length > 0 ? trimmedName : null,
          avatarUrl,
        },
      }
    );
    setSaving(false);

    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't save profile",
        onRetry: () => void saveProfile(),
      });
      return;
    }

    setSavedProfile(result.data);
    setFullName(result.data.fullName ?? "");
    setAvatarUrl(result.data.avatarUrl);
    emitProfileUpdate({
      full_name: result.data.fullName,
      avatar_url: result.data.avatarUrl,
    });
    toast.success("Profile updated");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="h-4 w-4 text-primary" />
            Profile
          </CardTitle>
          <CardDescription>
            Update the host identity shown across your Guestnix workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar className="h-20 w-20 text-lg">
              <AvatarImage src={avatarUrl ?? undefined} />
              <AvatarFallback>
                {getInitials(trimmedName || savedProfile.email)}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2 h-4 w-4" />
                )}
                Upload avatar
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAvatarUrl(null)}
                disabled={uploading || !avatarUrl}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadAvatar(file);
                  event.currentTarget.value = "";
                }}
              />
            </div>
            {uploading ? (
              <div className="w-full space-y-1 sm:max-w-xs">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Saving to Media... {uploadProgress}%
                </p>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="settings-full-name">Full name</Label>
              <Input
                id="settings-full-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your name"
                maxLength={100}
                disabled={saving}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="settings-email">Email</Label>
              <Input
                id="settings-email"
                value={savedProfile.email}
                disabled
                readOnly
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={saving || !dirty}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-primary" />
            Account email
          </CardTitle>
          <CardDescription>
            This email is used for sign-in, password resets, and billing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="break-all rounded-lg border bg-muted/35 px-3 py-2 text-sm font-medium">
            {savedProfile.email}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
