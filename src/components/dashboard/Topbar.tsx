"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { getInitials } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { BetaStatusBadge } from "@/components/dashboard/BetaStatusBadge";
import { useDashboardPageTitleState } from "@/components/dashboard/DashboardPageTitle";
import { MessageInboxButton } from "@/components/dashboard/MessageInboxButton";
import { NotificationBellButton } from "@/components/dashboard/NotificationBellButton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  BookOpen,
  LibraryBig,
  Building2,
  BarChart3,
  MessageSquare,
  Settings,
  Shield,
  ShoppingBag,
  Menu,
  LogOut,
  CreditCard,
  User,
} from "lucide-react";

const ICONS: Record<string, React.ElementType> = {
  LayoutDashboard,
  BookOpen,
  LibraryBig,
  Building2,
  BarChart3,
  MessageSquare,
  ShoppingBag,
  Settings,
  Shield,
};

function titleCaseSegment(segment: string): string {
  return segment
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isUuidLike(segment: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    segment
  );
}

function getBreadcrumb(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return "Dashboard";

  const dashboardIndex = segments.indexOf("dashboard");
  const dashboardSegments =
    dashboardIndex >= 0 ? segments.slice(dashboardIndex + 1) : segments;
  const [section, detail, child] = dashboardSegments;

  if (section === "guidebooks" && detail && isUuidLike(detail)) {
    return child ? titleCaseSegment(child) : "Guidebook settings";
  }

  const last = dashboardSegments[dashboardSegments.length - 1];
  return last ? titleCaseSegment(last) : "Dashboard";
}

export function Topbar({
  isPlatformAdmin = false,
}: {
  isPlatformAdmin?: boolean;
}) {
  const pathname = usePathname();
  const pageTitle = useDashboardPageTitleState();
  const shellTitle = pageTitle?.title.trim() || getBreadcrumb(pathname);
  const shellSubtitle = pageTitle?.subtitle?.trim();
  const { user, signOut } = useAuth();
  const navItems = NAV_ITEMS.filter(
    (item) => !("adminOnly" in item) || !item.adminOnly || isPlatformAdmin
  );

  return (
    <header className="flex items-center h-14 px-4 border-b bg-card gap-4">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex items-center h-16 px-4 border-b">
            <Link href="/dashboard" className="flex items-center gap-2">
              <BrandLockup size="sm" />
            </Link>
          </div>
          <nav className="space-y-1 p-2">
            {navItems.map((item) => {
              const Icon = ICONS[item.icon];
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Breadcrumb */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="min-w-0">
          {shellSubtitle ? (
            <p className="hidden truncate text-[11px] font-medium leading-4 text-muted-foreground sm:block">
              {shellSubtitle}
            </p>
          ) : null}
          <h2 className="truncate text-sm font-semibold">{shellTitle}</h2>
        </div>
        <BetaStatusBadge />
      </div>

      <NotificationBellButton />
      <MessageInboxButton />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="rounded-full" />}>
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="text-xs">
              {getInitials(user?.user_metadata?.full_name)}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">
              {user?.user_metadata?.full_name || "User"}
            </p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/dashboard/settings?tab=billing" />}>
            <CreditCard className="mr-2 h-4 w-4" />
            Billing
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
