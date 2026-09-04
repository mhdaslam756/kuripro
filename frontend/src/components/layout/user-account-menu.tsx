
import { Bell, ChevronDown, Download, LogOut, Smartphone } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { enablePush, hasRegisteredPush, isIosDevice, isPushSupported, sendLocalTestNotification } from "@/lib/push";
import { isStandalone } from "@/lib/pwa";
import { promptInstall } from "@/lib/pwa-runtime";
import { usePwa } from "@/lib/use-pwa";

export function UserAccountMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { canInstall } = usePwa();
  const [registered, setRegistered] = useState(hasRegisteredPush());
  const pushSupported = isPushSupported();
  const standalone = isStandalone();

  async function handleTogglePush() {
    if (registered) {
      void sendLocalTestNotification(
        "KuriPro Push Active 🔔",
        "Your push alerts are working properly!",
      );
      toast.success("Push notifications active. Test alert sent!");
    } else {
      try {
        const res = await enablePush();
        if (res.ok) {
          setRegistered(true);
          toast.success("Push notifications enabled!");
          void sendLocalTestNotification(
            "Push Notifications Enabled 🔔",
            "You will now receive timely reminders for kuri dues, live auctions, and payouts.",
          );
        } else {
          toast.error(res.error || "Could not enable push notifications");
        }
      } catch (err: any) {
        toast.error(err?.message || "Could not enable push notifications");
      }
    }
  }

  async function handleInstallApp() {
    if (isIosDevice()) {
      toast.info("To install on iOS: Tap Share at the bottom of Safari, then tap 'Add to Home Screen'.");
      return;
    }
    try {
      const accepted = await promptInstall();
      if (accepted) {
        toast.success("KuriPro installed successfully!");
      }
    } catch {
      // ignore
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  function getRoleBadgeVariant(slug?: string) {
    switch (slug) {
      case "SUPER_ADMIN":
        return "brand" as const;
      case "ORGANIZER":
        return "info" as const;
      case "STAFF":
        return "warning" as const;
      case "MEMBER":
        return "success" as const;
      default:
        return "neutral" as const;
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group active-bounce flex items-center gap-2.5 rounded-2xl border border-border-default/80 bg-bg-surface hover:bg-bg-raised p-1.5 pl-2.5 pr-2 shadow-xs transition-all outline-none"
            aria-label="User Account Menu"
          >
            <div className="text-right hidden sm:block">
              <div className="flex items-center justify-end gap-1.5">
                <p className="text-xs font-bold text-text-primary leading-tight">{user?.name || "User"}</p>
                <Badge variant={getRoleBadgeVariant(user?.role?.slug)} className="text-[9px] px-1 py-0 font-bold">
                  {user?.role?.name || "Role"}
                </Badge>
              </div>
              <p className="text-[10px] text-text-secondary truncate max-w-[140px]">{user?.email}</p>
            </div>

            <div className="relative flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 font-display text-xs font-bold text-white shadow-xs">
              {user?.name?.trim().charAt(0).toUpperCase() || "U"}
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>

            <ChevronDown size={14} className="text-text-secondary group-hover:text-text-primary transition-transform group-data-[state=open]:rotate-180" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl shadow-xl">
          <DropdownMenuLabel className="font-normal px-2 py-1.5">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-text-primary">{user?.name}</p>
                <Badge variant={getRoleBadgeVariant(user?.role?.slug)} className="text-[10px] px-1.5 py-0">
                  {user?.role?.name}
                </Badge>
              </div>
              <p className="text-[11px] text-text-secondary truncate">{user?.email}</p>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            {pushSupported ? (
              <DropdownMenuItem
                onClick={() => void handleTogglePush()}
                className="cursor-pointer flex items-center justify-between py-2 text-xs font-semibold rounded-xl"
              >
                <div className="flex items-center gap-2">
                  <Bell size={15} />
                  <span>Push Alerts</span>
                </div>
                <span className={registered ? "text-[10px] text-emerald-500 font-bold" : "text-[10px] text-accent-primary font-bold"}>
                  {registered ? "✓ Active" : "Enable"}
                </span>
              </DropdownMenuItem>
            ) : null}

            {!standalone && canInstall ? (
              <DropdownMenuItem
                onClick={() => void handleInstallApp()}
                className="cursor-pointer gap-2 py-2 text-xs font-semibold rounded-xl text-accent-primary"
              >
                <Download size={15} />
                <span>Install KuriPro App</span>
              </DropdownMenuItem>
            ) : null}

            <DropdownMenuItem
              onClick={() => navigate("/device")}
              className="cursor-pointer gap-2 py-2 text-xs font-semibold rounded-xl"
            >
              <Smartphone size={15} />
              <span>Devices & Security</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => void handleLogout()}
            className="cursor-pointer gap-2 py-2 text-xs font-semibold rounded-xl text-bad-fg focus:bg-bad-bg/20 focus:text-bad-fg"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
