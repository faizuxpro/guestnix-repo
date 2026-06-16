import type { BillingInterval, PlanKey } from "@/lib/billing/plans";

export type SettingsTabValue =
  | "profile"
  | "security"
  | "notifications"
  | "ai"
  | "billing";

export type ProfileSettingsData = {
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
};

export type AiSettingsData = {
  cap: number | null;
  used: number;
};

export type BillingSettingsData = {
  currentPlan: PlanKey | null;
  currentInterval: BillingInterval;
  status: string;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
};
