import { Banknote, BarChart3, Bell, Building2, Gavel, HandCoins, LayoutDashboard, Landmark, LogOut, Menu, Monitor, Moon, ShieldCheck, Smartphone, Sun, Settings2, Users, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Building2;
  /** When omitted, the item is shown to every authenticated user (e.g. personal device settings). */
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
    <div className="flex items-center rounded-full border border-border-default p-0.5">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setMode(value)}
          aria-label={`${label} theme`}
          aria-pressed={mode === value}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-text-secondary transition-colors",
            mode === value && "bg-accent-primary text-text-on-brand",
          )}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, hasPermission, logout } = useAuth();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const visibleItems = NAV_ITEMS.filter((item) => !item.permission || hasPermission(item.permission));
  const primaryItems = visibleItems.slice(0, 4);
  const moreItems = visibleItems.slice(4);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-[100dvh] bg-bg-app lg:flex">
      <aside className="hidden w-[272px] flex-none flex-col border-r border-border-default bg-bg-surface/90 p-4 backdrop-blur lg:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex size-10 items-center justify-center rounded-md bg-accent-primary font-display text-lg font-bold text-text-on-brand shadow-[0_5px_14px_rgb(114_83_32/0.22)]">K</div>
          <div>
            <p className="font-display text-xl font-semibold leading-none text-accent-primary">KuriPro</p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-text-secondary">Chit management</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1.5">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }: { isActive: boolean }) =>
                cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium text-text-secondary transition-all",
                  "hover:bg-brand-50/70 hover:text-text-primary",
                  isActive && "bg-brand-100/70 text-accent-primary shadow-sm",
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
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-border-default bg-bg-surface/85 px-4 py-2 backdrop-blur-xl lg:static lg:min-h-[72px] lg:px-8 lg:py-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex size-9 items-center justify-center rounded-md bg-accent-primary font-display text-lg font-bold text-text-on-brand shadow-sm">K</div>
              <div>
                <div className="font-display text-lg font-semibold leading-none text-accent-primary">KuriPro</div>
                <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.13em] text-text-secondary">Chit management</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <div className="flex items-center gap-2 lg:hidden">
              <ThemeToggle />
            </div>
            <div className="hidden lg:block"><ThemeToggle /></div>
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-text-primary">{user?.name}</p>
                <p className="text-xs text-text-secondary">{user?.role.name}</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-full bg-brand-100 font-semibold text-accent-primary ring-2 ring-brand-50 lg:hidden" aria-hidden="true">
                {user?.name?.trim().charAt(0).toUpperCase() || "U"}
              </div>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="hidden h-9 w-9 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bad-bg hover:text-bad-fg sm:flex"
                aria-label="Log out"
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-5 pb-28 sm:px-6 sm:py-7 lg:px-8 lg:py-8 lg:pb-8">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border-default bg-bg-surface/95 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-4px_24px_rgb(0_0_0/0.08)] backdrop-blur-xl lg:hidden" aria-label="Primary navigation">
        {primaryItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }: { isActive: boolean }) => cn(
              "active-bounce flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium text-text-secondary transition-all",
              isActive && "bg-brand-100/80 font-semibold text-accent-primary shadow-xs"
            )}
          >
            <Icon size={20} strokeWidth={2.2} />
            <span className="max-w-full truncate">{label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="active-bounce flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium text-text-secondary transition-all"
          aria-label="Open more navigation options"
          aria-expanded={moreOpen}
        >
          <Menu size={20} strokeWidth={2.2} />
          <span>More</span>
        </button>
      </nav>

      {moreOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="More navigation">
          <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity" aria-label="Close navigation" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-border-default bg-bg-surface px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border-strong/40" />
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="font-display text-xl font-bold text-text-primary">{user?.name || "User"}</p>
                <p className="text-xs font-medium text-text-secondary">{user?.role.name || "Member"}</p>
              </div>
              <button type="button" onClick={() => setMoreOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-raised text-text-secondary hover:text-text-primary" aria-label="Close navigation"><X size={20} /></button>
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">All Modules</p>
            <div className="grid grid-cols-2 gap-2.5">
              {moreItems.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} onClick={() => setMoreOpen(false)} className={({ isActive }: { isActive: boolean }) => cn("active-bounce flex min-h-[4.5rem] flex-col items-start justify-center gap-1.5 rounded-xl border border-border-default bg-bg-raised p-3.5 text-sm font-medium text-text-primary transition-all", isActive && "border-brand-400 bg-brand-50/80 text-accent-primary font-semibold shadow-xs")}>
                  <Icon size={20} className="text-accent-primary" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-border-default pt-4">
              <ThemeToggle />
              <button type="button" onClick={() => void handleLogout()} className="active-bounce flex min-h-11 items-center gap-2 rounded-xl bg-bad-bg px-4 py-2.5 text-sm font-semibold text-bad-fg"><LogOut size={17} /> Log out</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
