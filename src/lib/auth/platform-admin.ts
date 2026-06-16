import type { User } from "@supabase/supabase-js";

function configuredAdminIds() {
  return new Set(
    (process.env.PLATFORM_ADMIN_USER_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );
}

function hasAdminRole(appMetadata: User["app_metadata"]) {
  const role = appMetadata?.role;
  if (role === "admin" || role === "platform_admin") return true;

  const roles = appMetadata?.roles;
  return Array.isArray(roles) && roles.includes("admin");
}

export function isPlatformAdmin(user: User | null | undefined) {
  if (!user) return false;
  return configuredAdminIds().has(user.id) || hasAdminRole(user.app_metadata);
}
