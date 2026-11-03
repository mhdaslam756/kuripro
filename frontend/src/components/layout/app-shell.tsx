import { ArrowLeft, Banknote, Undo2, BarChart3, Bell, Building2, Gavel, HandCoins, LayoutDashboard, Landmark, LogOut, Menu, Monitor, Moon, ShieldCheck, Smartphone, Sun, Settings2, Users, X, ChevronRight } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { IconTile, type IconTone } from "@/components/ui/icon-tile";
import { cn } from "@/lib/utils";
import { HeaderInstallAppButton, HeaderPushNotificationButton } from "@/components/pwa/install-notification-toasts";
import { useLiveNotifications } from "@/features/notifications/use-live-notifications";
import { PullToRefresh } from "@/components/mobile/pull-to-refresh";
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
  { to: "/refunds", label: "Refunds", icon: Undo2, permission: "chit_group.enroll_member" },
  { to: "/reports", label: "Reports", icon: BarChart3, permission: "report.view" },
  { to: "/notifications", label: "Notifications", icon: Bell, permission: "notification.view" },
  { to: "/members", label: "Members", icon: Users, permission: "members.view" },
  { to: "/organization", label: "Organization", icon: Settings2, permission: "organization.manage" },
  { to: "/branches", label: "Branches", icon: Building2, permission: "branch.manage" },
  { to: "/roles", label: "Roles & Permissions", icon: ShieldCheck, permission: "role.manage" },
  { to: "/device", label: "Device & Security", icon: Smartphone },
];

/** One colour per destination in the More menu, so each row is recognisable at a glance. */
const MENU_TONES: Record<string, IconTone> = {
  "/payouts": "rose",
  "/refunds": "orange",
  "/reports": "indigo",
  "/notifications": "amber",
  "/members": "sky",
  "/organization": "violet",
  "/branches": "teal",
  "/roles": "emerald",
  "/device": "indigo",
};

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
            ? "text-accent-primary font-bold"
            : "text-text-secondary hover:text-text-primary",
        )
      }
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          {primary ? (
            /* Raised centre action */
            <div
              className={cn(
                "-mt-9 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-700 to-accent-primary text-white shadow-lg shadow-accent-primary/40 ring-[5px] ring-bg-app transition-all",
                isActive && "from-brand-800 to-brand-600",
              )}
            >
              <Icon size={22} strokeWidth={2.2} />
            </div>
          ) : (
            /* Standard tab — minimal clean pill when active */
            <div
              className={cn(
                "relative flex h-8 w-12 items-center justify-center rounded-xl transition-all duration-200",
                isActive && "bg-accent-primary/12 text-accent-primary",
              )}
            >
              <Icon size={19} strokeWidth={isActive ? 2.4 : 1.8} />
              {/* Active indicator pip */}
              {isActive && (
                <span
                  className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent-primary"
                  aria-hidden="true"
                />
              )}
            </div>
          )}
          <span className={cn(primary && "font-bold text-accent-primary")}>
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
        active ? "text-accent-primary font-bold" : "text-text-secondary hover:text-text-primary",
      )}
      aria-label="More Menu"
    >
      <div
        className={cn(
          "flex h-8 w-12 items-center justify-center rounded-xl transition-all duration-200",
          active && "bg-accent-primary/12 text-accent-primary",
        )}
      >
        <Menu size={19} strokeWidth={active ? 2.4 : 1.8} />
      </div>
      <span>More</span>
    </button>
  );
}

// ── Bottom Nav bar variants by role ───────────────────────────────────────────

/** Floating pill: lifted off the screen edge, with the centre action raised above it. */
const FLOATING_NAV =
  "fixed inset-x-4 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex h-[68px] transform-gpu items-center justify-around rounded-[30px] border border-border-default/60 bg-bg-surface px-2 shadow-[0_14px_40px_-10px_rgba(76,29,149,0.4)] [backface-visibility:hidden] [html[data-keyboard=open]_&]:hidden lg:hidden";

interface BottomNavProps {
  onMoreOpen: () => void;
  moreOpen: boolean;
}

function SuperAdminBottomNav({ onMoreOpen, moreOpen }: BottomNavProps) {
  return (
    <nav
      className={FLOATING_NAV}
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
      className={FLOATING_NAV}
      aria-label="Member Mobile Navigation"
    >
      <MobileTabItem to="/dashboard" label="Home" icon={LayoutDashboard} />
      <MobileTabItem to="/chit-groups" label="My Chits" icon={Landmark} />
      <MobileTabItem to="/auctions" label="Auctions" icon={Gavel} primary />
      <MobileTabItem to="/notifications" label="Alerts" icon={Bell} />
      <MobileMoreButton onClick={onMoreOpen} active={moreOpen} />
    </nav>
  );
}

function OrganizerBottomNav({ onMoreOpen, moreOpen }: BottomNavProps) {
  return (
    <nav
      className={FLOATING_NAV}
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

const ROUTE_TITLES: Record<string, string> = {
  "/device": "Devices & Security",
  "/super-admin/dashboard": "Dashboard",
};

/** Title for the mobile top bar, and whether the route is a drill-down (shows a back button). */
function useRouteChrome(items: NavItem[]): { title: string; isDetail: boolean } {
  const { pathname } = useLocation();
  const exact = items.find((i) => i.to === pathname);
  if (exact || ROUTE_TITLES[pathname]) return { title: exact?.label ?? ROUTE_TITLES[pathname]!, isDetail: false };
  const parent = items.find((i) => pathname.startsWith(`${i.to}/`));
  const singular = parent?.label.replace(/s$/, "");
  return { title: singular ?? "KuriPro", isDetail: Boolean(parent) };
}

// ── Main AppShell ─────────────────────────────────────────────────────────────

export function AppShell({ children }: { children: ReactNode }) {
  useLiveNotifications();
  const { user, hasPermission, logout } = useAuth();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();
  // On phones the dashboard draws its own hero (greeting, balance, actions) instead of the top bar.
  const isHeroRoute = pathname === "/dashboard";

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

  const { title: routeTitle, isDetail } = useRouteChrome(visibleItems);

  // While typing, the on-screen keyboard shrinks the page and would push the bottom bar up over the form.
  useEffect(() => {
    const isTextField = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      t.matches("textarea, select, [contenteditable='true'], input:not([type='checkbox'], [type='radio'], [type='button'], [type='submit'], [type='file'])");
    let timer: number | undefined;
    const onIn = (e: FocusEvent) => {
      if (!isTextField(e.target)) return;
      window.clearTimeout(timer);
      document.documentElement.dataset.keyboard = "open";
    };
    const onOut = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => delete document.documentElement.dataset.keyboard, 80);
    };
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
      delete document.documentElement.dataset.keyboard;
    };
  }, []);

  // A new screen always opens at the top, like a native navigation push.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.getElementById("app-scroll")?.scrollTo({ top: 0 });
  }, [pathname]);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-[100dvh] bg-bg-app select-none max-lg:h-dvh max-lg:overflow-hidden lg:flex">
      <PullToRefresh />

      {/* Desktop Sidebar */}
      <aside className="hidden w-[272px] flex-none flex-col border-r border-border-default bg-bg-surface/90 p-4 backdrop-blur lg:flex select-text">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex size-10 items-center justify-center rounded-sm bg-gradient-to-br from-[#6D28D9] to-[#8B5CF6] font-display text-lg font-bold text-white shadow-md shadow-[#6D28D9]/25">K</div>
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
                  "flex items-center gap-2.5 rounded-sm px-3.5 py-2.5 text-sm font-medium text-text-secondary transition-all",
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

      <div id="app-scroll" className="flex min-w-0 flex-1 flex-col max-lg:h-full max-lg:overflow-x-hidden max-lg:overflow-y-auto max-lg:overscroll-none">
        {/* Compact Top Header */}
        <header
          className={cn(
            // Phones: no bar at all, just a large title on the page background.
            "relative z-30 flex items-center justify-between gap-3 bg-bg-app px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-1",
            "lg:sticky lg:top-0 lg:z-40 lg:min-h-[72px] lg:border-b lg:border-border-default/50 lg:bg-bg-surface/85 lg:px-8 lg:py-3 lg:backdrop-blur-2xl",
            isHeroRoute && "max-sm:hidden",
          )}
        >
          {/* Mobile Header Left: back button on drill-down screens, large screen title everywhere */}
          <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
            {isDetail ? (
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="Go back"
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border-default bg-bg-surface text-text-primary shadow-xs active-bounce"
              >
                <ArrowLeft size={20} />
              </button>
            ) : null}
            <h1 className="truncate font-display text-[28px] font-extrabold leading-tight tracking-tight text-text-primary">{routeTitle}</h1>
          </div>

          {/* Desktop Header Left */}
          <div className="hidden lg:flex lg:items-center lg:gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6D28D9] to-[#8B5CF6] font-display text-sm font-bold text-white shadow-xs">K</div>
            <span className="text-sm font-semibold text-text-primary">KuriPro Management Platform</span>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-2 lg:gap-3">
            {/* Install App & Push Alert Actions */}
            <HeaderInstallAppButton />
            <HeaderPushNotificationButton />

            {/* Notification bell */}
            <NavLink
              to="/notifications"
              className="relative flex size-10 items-center justify-center rounded-full border border-border-default bg-bg-surface text-text-secondary shadow-xs transition-all hover:text-text-primary active-bounce lg:size-9 lg:rounded-xl lg:border-0 lg:bg-bg-raised lg:shadow-none"
              aria-label="Notifications"
            >
              <Bell size={17} />
            </NavLink>

            <div className="hidden lg:block">
              <ThemeToggle />
            </div>

            {/* Desktop User Account Menu */}
            <div className="hidden lg:block">
              <UserAccountMenu />
            </div>
          </div>
        </header>

        {/* Main App Content Area */}
        <main
          key={pathname}
          className={cn(
            "page-enter flex-1 overflow-y-auto max-lg:overflow-visible px-4 pt-3 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-7 lg:px-8 lg:py-8 lg:pb-8 select-text",
            isHeroRoute && "max-sm:px-0 max-sm:pt-0",
          )}
        >
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
                      <IconTile tone={MENU_TONES[to] ?? "violet"} className={cn(isActive && "ring-2 ring-accent-primary/40")}>
                        <Icon size={18} />
                      </IconTile>
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
