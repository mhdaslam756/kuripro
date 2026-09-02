import { Banknote, BarChart3, Bell, Building2, Gavel, HandCoins, LayoutDashboard, Landmark, LogOut, Menu, Monitor, Moon, ShieldCheck, Smartphone, Sun, Settings2, Users, X, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";
import { UserAccountMenu } from "./user-account-menu";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Building2;
  permission?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { to: "/chit-groups", label: "Chit Groups", icon: Landmark, permission: "chit_group.view" },
  { to: "/collections", label: "Collections", icon: HandCoins, permission: "collection.view" },
  { to: "/auctions", label: "Auctions", icon: Gavel, permission: "auction.view" },
  { to: "/payouts", label: "Prize Payouts", icon: Banknote, permission: "payout.view" },
  { to: "/reports", label: "Reports", icon: BarChart3, permission: "report.view" },
  { to: "/notifications", label: "Notifications", icon: Bell, permission: "notification.view" },
  { to: "/members", label: "Members", icon: Users, permission: "members.view" },
  { to: "/organization", label: "Organization", icon: Settings2, permission: "organization.manage" },
  { to: "/branches", label: "Branches", icon: Building2, permission: "branch.manage" },
  { to: "/roles", label: "Roles & Permissions", icon: ShieldCheck, permission: "role.manage" },
  { to: "/device", label: "Device & Security", icon: Smartphone },
];

function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const options: { value: typeof mode; icon: typeof Sun; label: string }[] = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "system", icon: Monitor, label: "System" },
    { value: "dark", icon: Moon, label: "Dark" },
  ];

  return (
    <div className="flex items-center rounded-full border border-border-default bg-bg-raised p-0.5 shadow-xs">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setMode(value)}
          aria-label={`${label} theme`}
          aria-pressed={mode === value}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-text-secondary transition-all active-bounce",
            mode === value && "bg-accent-primary text-text-on-brand shadow-xs font-bold",
          )}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}

// ── Mobile Bottom Tab Item ─────────────────────────────────────────────────────

interface MobileTabItemProps {
  to: string;
  label: string;
  icon: typeof Building2;
  /** If true, render as a prominent "center action" pill */
  primary?: boolean;
}

function MobileTabItem({ to, label, icon: Icon, primary = false }: MobileTabItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }: { isActive: boolean }) =>
        cn(
          "active-bounce relative flex flex-1 flex-col items-center gap-1 py-1.5 text-[10px] font-semibold transition-all select-none",
          primary
            ? isActive
              ? "text-accent-primary"
              : "text-text-secondary"
            : isActive
            ? "text-accent-primary"
            : "text-text-secondary hover:text-text-primary",
        )
      }
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          {primary ? (
            /* Primary "collect" pill — elevated gradient button */
            <div
              className={cn(
                "flex h-[42px] w-[54px] items-center justify-center rounded-[16px] shadow-lg transition-all",
                "bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white",
                isActive && "ring-2 ring-[#8B5CF6] ring-offset-2 ring-offset-bg-surface shadow-[#6D28D9]/40",
              )}
            >
              <Icon size={20} strokeWidth={2.5} />
            </div>
          ) : (
            /* Standard tab — pill background when active */
            <div
              className={cn(
                "relative flex h-9 w-14 items-center justify-center rounded-full transition-all duration-200",
                isActive && "bg-[#6D28D9]/20 text-[#A855F7]",
              )}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              {/* Active indicator pip */}
              {isActive && (
                <span
                  className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#8B5CF6]"
                  aria-hidden="true"
                />
              )}
            </div>
          )}
          <span className={cn(primary && "font-bold text-[#A855F7]")}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

// ── More button ────────────────────────────────────────────────────────────────

interface MobileMoreButtonProps {
  onClick: () => void;
  active: boolean;
}

function MobileMoreButton({ onClick, active }: MobileMoreButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "active-bounce relative flex flex-1 flex-col items-center gap-1 py-1.5 text-[10px] font-semibold transition-all select-none",
        active ? "text-accent-primary" : "text-text-secondary hover:text-text-primary",
      )}
      aria-label="More Menu"
    >
      <div
        className={cn(
          "flex h-9 w-14 items-center justify-center rounded-full transition-all duration-200",
          active && "bg-[#6D28D9]/20 text-[#A855F7]",
        )}
      >
        <Menu size={20} strokeWidth={active ? 2.5 : 2} />
      </div>
      <span>More</span>
    </button>
  );
}

// ── Bottom Nav bar variants by role ───────────────────────────────────────────

interface BottomNavProps {
  onMoreOpen: () => void;
  moreOpen: boolean;
}

function SuperAdminBottomNav({ onMoreOpen, moreOpen }: BottomNavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-end justify-around border-t border-border-default/70 bg-bg-surface/95 px-2 pt-1 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-[0_-8px_40px_rgb(0_0_0/0.10)] backdrop-blur-2xl lg:hidden"
      aria-label="Super Admin Mobile Navigation"
    >
      <MobileTabItem to="/super-admin/dashboard" label="Dashboard" icon={LayoutDashboard} />
      <MobileTabItem to="/device" label="Devices" icon={Smartphone} />
      <MobileMoreButton onClick={onMoreOpen} active={moreOpen} />
    </nav>
  );
}

function MemberBottomNav({ onMoreOpen, moreOpen }: BottomNavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-end justify-around border-t border-border-default/70 bg-bg-surface/95 px-2 pt-1 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-[0_-8px_40px_rgb(0_0_0/0.10)] backdrop-blur-2xl lg:hidden"
      aria-label="Member Mobile Navigation"
    >
      <MobileTabItem to="/dashboard" label="Home" icon={LayoutDashboard} />
      <MobileTabItem to="/chit-groups" label="My Chits" icon={Landmark} />
      <MobileTabItem to="/auctions" label="Auctions" icon={Gavel} />
      <MobileMoreButton onClick={onMoreOpen} active={moreOpen} />
    </nav>
  );
}

function OrganizerBottomNav({ onMoreOpen, moreOpen }: BottomNavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-end justify-around border-t border-border-default/70 bg-bg-surface/95 px-2 pt-1 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-[0_-8px_40px_rgb(0_0_0/0.10)] backdrop-blur-2xl lg:hidden"
      aria-label="App Navigation"
    >
      <MobileTabItem to="/dashboard" label="Home" icon={LayoutDashboard} />
      <MobileTabItem to="/chit-groups" label="Chits" icon={Landmark} />
      <MobileTabItem to="/collections" label="Collect" icon={HandCoins} primary />
      <MobileTabItem to="/auctions" label="Auctions" icon={Gavel} />
      <MobileMoreButton onClick={onMoreOpen} active={moreOpen} />
    </nav>
  );
}

// ── Main AppShell ─────────────────────────────────────────────────────────────

export function AppShell({ children }: { children: ReactNode }) {
  const { user, hasPermission, logout } = useAuth();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  let visibleItems = NAV_ITEMS.filter((item) => {
    if (user?.role?.slug === "MEMBER") {
      return ["/dashboard", "/chit-groups", "/auctions", "/notifications", "/device"].includes(item.to);
    }
    return !item.permission || hasPermission(item.permission);
  });

  if (user?.role?.slug === "SUPER_ADMIN") {
    visibleItems = [
      { to: "/super-admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/device", label: "Devices & Security", icon: Smartphone },
    ];
  }

  const moreItems = visibleItems.filter(
    (i) => !["/dashboard", "/super-admin/dashboard", "/chit-groups", "/collections", "/auctions"].includes(i.to),
  );

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const firstName = user?.name?.trim().split(" ")[0] || "User";

  return (
    <div className="min-h-[100dvh] bg-bg-app lg:flex select-none">
      {/* Desktop Sidebar */}
      <aside className="hidden w-[272px] flex-none flex-col border-r border-border-default bg-bg-surface/90 p-4 backdrop-blur lg:flex select-text">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#6D28D9] to-[#8B5CF6] font-display text-lg font-bold text-white shadow-md shadow-[#6D28D9]/25">K</div>
          <div>
            <p className="font-display text-xl font-bold leading-none text-text-primary">KuriPro</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Chit Management</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1.5">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }: { isActive: boolean }) =>
                cn(
                  "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-text-secondary transition-all",
                  "hover:bg-bg-raised hover:text-text-primary",
                  isActive && "bg-[#6D28D9]/15 text-accent-primary font-semibold shadow-xs border border-[#8B5CF6]/30",
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border-default/70 bg-bg-surface/92 px-4 pt-[max(0.65rem,env(safe-area-inset-top))] pb-3 backdrop-blur-xl lg:static lg:min-h-[72px] lg:px-8 lg:py-3">
          {/* Mobile Header Left: Avatar + Greeting */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="relative flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-[#6D28D9] to-[#8B5CF6] font-display text-sm font-bold text-white shadow-xs">
              {user?.name?.trim().charAt(0).toUpperCase() || "K"}
              {/* Online presence dot */}
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-bg-surface" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-display text-sm font-bold leading-none text-text-primary">
                  {firstName}
                </p>
                <span className="rounded-md bg-[#6D28D9]/20 border border-[#8B5CF6]/30 px-1.5 py-0.2 text-[9px] font-extrabold uppercase text-[#A855F7]">
                  {user?.role?.name || "User"}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-text-secondary leading-none">Welcome back 👋</p>
            </div>
          </div>

          {/* Desktop Header Left */}
          <div className="hidden lg:flex lg:items-center lg:gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6D28D9] to-[#8B5CF6] font-display text-sm font-bold text-white shadow-xs">K</div>
            <span className="text-sm font-semibold text-text-primary">KuriPro Management Platform</span>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Notification bell */}
            <NavLink
              to="/notifications"
              className="relative flex size-9 items-center justify-center rounded-full bg-bg-raised text-text-secondary transition-all hover:text-text-primary active-bounce"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {/* Unread dot */}
              <span
                className="absolute right-1.5 top-1.5 size-2 rounded-full bg-bad-fg ring-2 ring-bg-surface"
                aria-hidden="true"
              />
            </NavLink>

            <ThemeToggle />

            {/* Desktop User Account Menu */}
            <div className="hidden lg:block">
              <UserAccountMenu />
            </div>
          </div>
        </header>

        {/* Main App Content Area */}
        <main className="flex-1 overflow-y-auto px-4 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-7 lg:px-8 lg:py-8 lg:pb-8 select-text">
          <div className="mx-auto w-full max-w-[1440px]">
            {children}
          </div>
        </main>
      </div>

      {/* ── Bottom Navigation Bar (role-adaptive) ── */}
      {user?.role?.slug === "SUPER_ADMIN" ? (
        <SuperAdminBottomNav onMoreOpen={() => setMoreOpen(true)} moreOpen={moreOpen} />
      ) : user?.role?.slug === "MEMBER" ? (
        <MemberBottomNav onMoreOpen={() => setMoreOpen(true)} moreOpen={moreOpen} />
      ) : (
        <OrganizerBottomNav onMoreOpen={() => setMoreOpen(true)} moreOpen={moreOpen} />
      )}

      {/* ── "More" Bottom Sheet Drawer ── */}
      {moreOpen ? (
        <div className="fixed inset-0 z-[9999] lg:hidden" role="dialog" aria-modal="true" aria-label="More Options Menu">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setMoreOpen(false)}
          />

          {/* Sliding Bottom Drawer */}
          <div className="fixed inset-x-0 bottom-0 z-10 max-h-[85dvh] overflow-y-auto rounded-t-[28px] border-t border-border-default bg-bg-surface px-5 pt-3 pb-[max(1.75rem,env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom duration-250">
            {/* Top Handle */}
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border-strong/40" />

            {/* User Profile Card in Drawer */}
            <div className="mb-5 rounded-2xl border border-border-default bg-bg-raised p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 font-bold text-white shadow-sm text-base">
                    {user?.name?.trim().charAt(0).toUpperCase() || "U"}
                    <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 ring-2 ring-bg-raised" />
                  </div>
                  <div>
                    <p className="font-display text-base font-bold text-text-primary">{user?.name || "User"}</p>
                    <p className="text-xs font-semibold text-text-secondary">{user?.role?.name || "Organizer"}</p>
                    {user?.email ? <p className="text-[11px] text-text-secondary truncate max-w-[170px]">{user.email}</p> : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="flex size-9 items-center justify-center rounded-full bg-bg-surface text-text-secondary hover:text-text-primary shadow-xs active-bounce"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <p className="mb-2 native-section-label">App Features &amp; Settings</p>

            <div className="native-section">
              {moreItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }: { isActive: boolean }) =>
                    cn(
                      "native-row native-row-pressable",
                      isActive && "text-accent-primary",
                    )
                  }
                >
                  {({ isActive }: { isActive: boolean }) => (
                    <>
                      <span className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                        isActive ? "bg-brand-100 text-accent-primary" : "bg-bg-raised text-text-secondary",
                      )}>
                        <Icon size={18} />
                      </span>
                      <span className={cn("flex-1 text-sm font-semibold", isActive ? "text-accent-primary" : "text-text-primary")}>
                        {label}
                      </span>
                      <ChevronRight size={15} className="text-text-secondary" />
                    </>
                  )}
                </NavLink>
              ))}
            </div>


            <div className="mt-6 flex items-center justify-between border-t border-border-default/80 pt-4">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="active-bounce flex min-h-11 items-center gap-2 rounded-2xl bg-bad-bg px-4 py-2.5 text-xs font-bold text-bad-fg shadow-xs"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
