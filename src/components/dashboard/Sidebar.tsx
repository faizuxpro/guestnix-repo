"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { getInitials } from "@/lib/utils";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  LogOut,
  CreditCard,
  User,
  ChevronsLeft,
  ChevronsRight,
  ShoppingBag,
} from "lucide-react";
import { TrialCard, type TrialInfo } from "./TrialCard";

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

export function Sidebar({
  trial,
  isPlatformAdmin = false,
}: {
  trial: TrialInfo;
  isPlatformAdmin?: boolean;
}) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const navItems = NAV_ITEMS.filter(
    (item) => !("adminOnly" in item) || !item.adminOnly || isPlatformAdmin
  );

  return (
    <aside
      id="dashboard-sidebar"
      className={cn(
        "hidden md:flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border",
          collapsed ? "justify-center px-2" : "px-4"
        )}
      >
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center">
            <BrandLockup
              size="sm"
              tone="light"
              showText
              logoClassName="h-6"
            />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-controls="dashboard-sidebar"
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "size-8 text-sidebar-foreground/70 hover:!bg-sidebar-accent/70 hover:!text-sidebar-foreground focus-visible:!border-sidebar-ring/60 focus-visible:!ring-sidebar-ring/40",
            !collapsed && "ml-auto"
          )}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronsRight className="size-4" aria-hidden="true" />
          ) : (
            <ChevronsLeft className="size-4" aria-hidden="true" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = ICONS[item.icon];
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                pathname.startsWith(item.href));
            const navLink = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-9 items-center rounded-lg text-sm transition-colors",
                  collapsed ? "justify-center px-0" : "gap-3 px-3",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
                aria-label={collapsed ? item.label : undefined}
              >
                {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );

            if (!collapsed) {
              return navLink;
            }

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger render={navLink} />
                <TooltipContent
                  side="right"
                  sideOffset={10}
                  className="border border-sidebar-border bg-sidebar-accent px-2.5 py-1.5 text-xs font-medium tracking-normal text-sidebar-accent-foreground shadow-lg shadow-black/20 ring-1 ring-white/10"
                  arrowClassName="bg-sidebar-accent fill-sidebar-accent"
                >
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Trial / subscription card */}
      {trial.status !== "active" && trial.plan && (
        <div className="px-2 pb-2">
          <TrialCard {...trial} collapsed={collapsed} />
        </div>
      )}

      {/* User menu */}
      <div className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-2 px-2 text-sidebar-foreground hover:bg-sidebar-accent",
                  collapsed && "justify-center px-0"
                )}
              />
            }
          >
            <Avatar className="h-7 w-7">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="text-xs bg-sidebar-primary text-sidebar-primary-foreground">
                {getInitials(user?.user_metadata?.full_name)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex flex-col items-start text-xs truncate">
                <span className="font-medium truncate">
                  {user?.user_metadata?.full_name || "User"}
                </span>
                <span className="text-sidebar-foreground/60 truncate">
                  {user?.email}
                </span>
              </div>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
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
      </div>
    </aside>
  );
}
