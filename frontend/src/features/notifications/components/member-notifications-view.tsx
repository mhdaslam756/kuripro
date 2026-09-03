import { useState, useMemo } from "react";
import {
  Bell,
  BellRing,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Gavel,
  Landmark,
  Mail,
  MessageSquare,
  Radio,
  Receipt,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime, humanize } from "@/lib/format";
import { enablePush, hasRegisteredPush, isPushSupported, sendLocalTestNotification } from "@/lib/push";
import { cn } from "@/lib/utils";
import type { NotificationRecord } from "../types";
import { useHistory } from "../use-notifications";

type CategoryFilter = "ALL" | "DUES" | "AUCTIONS" | "PAYMENTS" | "ANNOUNCEMENTS";

interface TypeConfig {
  icon: typeof Bell;
  iconBg: string;
  iconFg: string;
  category: CategoryFilter;
  label: string;
}

function getTypeConfig(type: string): TypeConfig {
  switch (type) {
    case "WINNER":
    case "AUCTION_RESULT":
      return { icon: Trophy, iconBg: "bg-amber-500/15", iconFg: "text-amber-500", category: "AUCTIONS", label: "Cycle Winner" };
    case "AUCTION":
    case "AUCTION_REMINDER":
      return { icon: Gavel, iconBg: "bg-purple-500/15", iconFg: "text-purple-400", category: "AUCTIONS", label: "Live Auction" };
    case "REMINDER":
    case "DUE_REMINDER":
    case "OVERDUE_ALERT":
      return { icon: Calendar, iconBg: "bg-red-500/15", iconFg: "text-red-400", category: "DUES", label: "Payment Due" };
    case "RECEIPT":
    case "PAYMENT_CONFIRMATION":
      return { icon: CheckCircle2, iconBg: "bg-emerald-500/15", iconFg: "text-emerald-400", category: "PAYMENTS", label: "Payment Receipt" };
    case "BIRTHDAY":
      return { icon: Sparkles, iconBg: "bg-pink-500/15", iconFg: "text-pink-400", category: "ANNOUNCEMENTS", label: "Birthday Wishes" };
    case "PAYOUT_DISBURSED":
      return { icon: Wallet, iconBg: "bg-blue-500/15", iconFg: "text-blue-400", category: "PAYMENTS", label: "Prize Payout" };
    case "CUSTOM":
    case "GENERAL_ANNOUNCEMENT":
    default:
      return { icon: BellRing, iconBg: "bg-brand-500/15", iconFg: "text-accent-primary", category: "ANNOUNCEMENTS", label: "Announcement" };
  }
}

function getChannelBadge(channel: string) {
  switch (channel) {
    case "WHATSAPP":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#25D366]/15 px-2 py-0.5 text-[10px] font-bold text-[#25D366] border border-[#25D366]/30">
          <MessageSquare size={10} /> WhatsApp
        </span>
      );
    case "PUSH":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold text-accent-primary border border-brand-500/30">
          <Smartphone size={10} /> Push
        </span>
      );
    case "EMAIL":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/30">
          <Mail size={10} /> Email
        </span>
      );
    case "SMS":
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
          <Radio size={10} /> SMS
        </span>
      );
  }
}

const CATEGORY_TABS = [
  { id: "ALL", label: "All", icon: Bell },
  { id: "DUES", label: "Dues", icon: Calendar },
  { id: "AUCTIONS", label: "Auctions", icon: Trophy },
  { id: "PAYMENTS", label: "Receipts", icon: Receipt },
  { id: "ANNOUNCEMENTS", label: "Updates", icon: Sparkles },
] as const;

export function PushNotificationBanner() {
  const supported = isPushSupported();
  const [registered, setRegistered] = useState(hasRegisteredPush());
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

  if (!supported) return null;

  async function handleEnable() {
    setBusy(true);
    try {
      const res = await enablePush();
      if (res.ok) {
        setRegistered(true);
        toast.success("Push notifications enabled on this device!");
        void sendLocalTestNotification(
          "Push Notifications Enabled 🔔",
          "You will now receive instant push alerts for kuri installment dues and auction events.",
        );
      } else {
        toast.error(res.error || "Could not enable push notifications");
      }
    } catch {
      toast.error("An error occurred while enabling push notifications");
    } finally {
      setBusy(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const success = await sendLocalTestNotification(
        "KuriPro Reminder Test 🔔",
        "Your device is connected! When an installment is due or an auction closes, you'll see a reminder alert here.",
      );
      if (success) {
        toast.success("Test reminder alert sent to your device!");
      } else {
        toast.error("Could not trigger notification. Check browser permissions.");
      }
    } finally {
      setTesting(false);
    }
  }

  if (registered) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 sm:px-4 sm:py-3 text-xs shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 size={15} />
          </span>
          <div>
            <p className="font-semibold text-text-primary">Push Alerts Active</p>
            <p className="text-[11px] text-text-secondary">Instant reminder alerts for cycle dues &amp; auction results are enabled on this device.</p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={testing}
          onClick={() => void handleTest()}
          className="h-8 gap-1.5 rounded-xl text-xs font-semibold active-bounce border-border-default hover:bg-bg-raised"
        >
          <Bell size={12} /> {testing ? "Sending…" : "Test Alert"}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-950/40 via-brand-900/20 to-bg-surface p-4 sm:p-5 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-600/20 text-accent-primary shadow-xs border border-brand-500/30">
            <BellRing size={20} className="animate-pulse" />
          </div>
          <div>
            <h3 className="font-display text-sm sm:text-base font-bold text-text-primary flex items-center gap-2">
              Enable Reminder Push Notifications
              <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-bold text-accent-primary border border-brand-500/30">
                Recommended
              </span>
            </h3>
            <p className="mt-0.5 text-xs text-text-secondary max-w-xl">
              Never miss an upcoming installment due date or auction announcement. Get instant push alerts pushed directly to your phone or desktop.
            </p>
          </div>
        </div>
        <Button
          type="button"
          disabled={busy}
          onClick={() => void handleEnable()}
          className="shrink-0 active-bounce gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2 text-xs shadow-md"
        >
          <Smartphone size={14} />
          {busy ? "Enabling…" : "Enable Push Alerts"}
        </Button>
      </div>
    </div>
  );
}

export function MemberNotificationsView() {
  const { user } = useAuth();
  const [selectedNotification, setSelectedNotification] = useState<NotificationRecord | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, isError, refetch } = useHistory({ page: 1 });

  const notifications = data?.items ?? [];

  // Filter notifications by category & search
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const cfg = getTypeConfig(item.type);
      if (activeCategory !== "ALL" && cfg.category !== activeCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSubject = item.subject?.toLowerCase().includes(query);
        const matchesBody = item.body.toLowerCase().includes(query);
        const matchesType = item.type.toLowerCase().includes(query);
        if (!matchesSubject && !matchesBody && !matchesType) {
          return false;
        }
      }
      return true;
    });
  }, [notifications, activeCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts = { ALL: notifications.length, DUES: 0, AUCTIONS: 0, PAYMENTS: 0, ANNOUNCEMENTS: 0 };
    for (const item of notifications) {
      const cfg = getTypeConfig(item.type);
      counts[cfg.category] = (counts[cfg.category] || 0) + 1;
    }
    return counts;
  }, [notifications]);

  const firstName = user?.name?.trim().split(" ")[0] || "Member";

  return (
    <div className="flex flex-col gap-4 sm:gap-6 pb-12">
      {/* ═══════════════════════════════════════════════════════════════════════
          MOBILE VIEW (sm:hidden)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-3.5 sm:hidden">
        {/* Mobile Header Card */}
        <div className="mobile-balance-card p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-white/15 text-white">
                <BellRing size={15} className="animate-pulse" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-white/90">
                Activity Hub
              </span>
            </div>
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white border border-white/20">
              {notifications.length} {notifications.length === 1 ? "Update" : "Updates"}
            </span>
          </div>

          <h1 className="font-display text-2xl font-bold text-white leading-tight">
            Notifications
          </h1>
          <p className="mt-1 text-xs text-white/80 leading-relaxed">
            Live due reminders, cycle winners, and payment acknowledgments for {firstName}.
          </p>

          <div className="mt-4 flex items-center gap-2 border-t border-white/15 pt-3">
            <Link to="/auctions" className="flex-1">
              <Button
                type="button"
                className="w-full active-bounce flex  items-center justify-center gap-1.5 rounded-xl bg-white/15 py-2 text-xs font-semibold text-white border border-white/20"
              >
                <Gavel size={13} /> Live Bids
              </Button>
            </Link>
            <Link to="/chit-groups" className="flex-1">
              <button
                type="button"
                className="w-full active-bounce flex items-center justify-center gap-1.5 rounded-xl bg-white text-[#120D22] py-2 text-xs font-bold shadow-xs"
              >
                <Landmark size={13} /> My Schemes
              </button>
            </Link>
          </div>
        </div>

        {/* Push Notification Opt-in / Status Banner */}
        <PushNotificationBanner />

        {/* Mobile Filter Scroll Pills */}
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto py-1">
          {CATEGORY_TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeCategory === id;
            const count = categoryCounts[id] || 0;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveCategory(id)}
                className={cn(
                  "active-bounce shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
                  isActive
                    ? "bg-[#6D28D9] text-white shadow-sm border border-[#8B5CF6]/50"
                    : "bg-bg-surface text-text-secondary hover:text-text-primary border border-border-default",
                )}
              >
                <Icon size={12} />
                <span>{label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                    isActive ? "bg-white/25 text-white" : "bg-bg-raised text-text-secondary",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mobile Search Input */}
        {notifications.length > 0 && (
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-border-default bg-bg-surface pl-10 pr-4 text-xs font-medium text-text-primary placeholder:text-text-secondary focus:border-brand-500 focus:outline-none transition-colors"
            />
          </div>
        )}

        {/* Mobile Content / Native Rows */}
        {isLoading ? (
          <div className="flex flex-col gap-2.5">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-bad-border/40 bg-bad-bg/10 p-6 text-center">
            <p className="text-xs font-semibold text-bad-fg">Couldn't load notifications.</p>
            <Button size="sm" variant="outline" onClick={() => void refetch()} className="mt-3 text-xs h-8">
              Try Again
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          /* Mobile "All Caught Up" Card */
          <div className="flex flex-col items-center justify-center rounded-3xl border border-border-default bg-bg-surface p-6 text-center shadow-xs">
            <div className="relative mb-4 flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-[#6D28D9]/20 to-[#8B5CF6]/20 text-[#8B5CF6] ring-6 ring-[#6D28D9]/10">
              <BellRing size={28} className="animate-bounce" />
            </div>
            <h2 className="font-display text-lg font-bold text-text-primary">
              You're All Caught Up! 🎉
            </h2>
            <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">
              No pending dues or new auction alerts right now. You'll be notified immediately when updates are posted.
            </p>

            {/* Mobile Feature Badges */}
            <div className="mt-5 grid w-full grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-border-default bg-bg-raised p-2.5">
                <Calendar size={15} className="mx-auto text-emerald-500 mb-1" />
                <p className="text-[10px] font-bold text-text-primary">Dues</p>
              </div>
              <div className="rounded-xl border border-border-default bg-bg-raised p-2.5">
                <Trophy size={15} className="mx-auto text-amber-500 mb-1" />
                <p className="text-[10px] font-bold text-text-primary">Auctions</p>
              </div>
              <div className="rounded-xl border border-border-default bg-bg-raised p-2.5">
                <ShieldCheck size={15} className="mx-auto text-blue-500 mb-1" />
                <p className="text-[10px] font-bold text-text-primary">Payouts</p>
              </div>
            </div>

            <Link to="/dashboard" className="mt-5 w-full">
              <Button size="sm" className="w-full rounded-xl font-semibold gap-1.5 text-xs">
                <Zap size={13} /> Back to Dashboard
              </Button>
            </Link>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-default bg-bg-surface p-8 text-center">
            <p className="text-xs font-bold text-text-primary">No matching notifications</p>
            <Button size="sm" variant="outline" onClick={() => { setActiveCategory("ALL"); setSearchQuery(""); }} className="mt-3 text-xs h-7">
              Reset Filters
            </Button>
          </div>
        ) : (
          /* Mobile Notification Rows */
          <div className="flex flex-col gap-2.5">
            {filteredNotifications.map((notification) => {
              const config = getTypeConfig(notification.type);
              const Icon = config.icon;
              const title = notification.subject || config.label;

              return (
                <div
                  key={notification.id}
                  onClick={() => setSelectedNotification(notification)}
                  className="active-bounce group flex cursor-pointer items-start gap-3 rounded-2xl border border-border-default bg-bg-surface p-3.5 shadow-xs transition-all active:bg-bg-raised"
                >
                  <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", config.iconBg, config.iconFg)}>
                    <Icon size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1.5">
                      <h3 className="font-display text-xs font-bold text-text-primary truncate">
                        {title}
                      </h3>
                      <span className="shrink-0 text-[10px] font-medium text-text-secondary tabular-nums">
                        {formatDateTime(notification.createdAt)}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-text-secondary line-clamp-2 leading-relaxed">
                      {notification.body}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-text-secondary border-t border-border-default/50 pt-1.5">
                      <div className="flex items-center gap-1.5">
                        {getChannelBadge(notification.channel)}
                      </div>
                      <span className="flex items-center gap-1 text-good-fg font-semibold">
                        <CheckCircle2 size={11} /> Delivered
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          DESKTOP VIEW (hidden sm:flex)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden sm:flex sm:flex-col sm:gap-6">
        {/* Desktop Top Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-border-default bg-gradient-to-br from-[#120D22] via-[#1A1330] to-[#261642] p-6 shadow-xl sm:p-8">
          <div className="absolute -top-24 -right-24 size-72 rounded-full bg-brand-600/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 size-72 rounded-full bg-accent-primary/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6D28D9] to-[#8B5CF6] text-white shadow-lg shadow-[#6D28D9]/30">
                <BellRing size={26} className="animate-pulse" />
                <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-emerald-500 ring-2 ring-[#120D22]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
                    Notification Hub
                  </h1>
                  <span className="rounded-full bg-brand-500/20 border border-brand-400/30 px-2.5 py-0.5 text-xs font-semibold text-[#A855F7]">
                    {notifications.length} {notifications.length === 1 ? "Update" : "Updates"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/70 sm:text-sm">
                  Real-time scheme dues, live bidding results, and payout alerts for {firstName}.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/auctions">
                <Button size="sm"  className="border-white/20 text-white hover:bg-white/10 rounded-xl gap-1.5 text-xs font-semibold">
                  <Gavel size={14} /> Live Bids
                </Button>
              </Link>
              <Link to="/chit-groups">
                <Button size="sm" className="rounded-xl gap-1.5 text-xs font-semibold">
                  <Landmark size={14} /> My Schemes
                </Button>
              </Link>
            </div>
          </div>

          {/* Desktop Category Filter Pills */}
          <div className="relative z-10 mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4">
            {CATEGORY_TABS.map(({ id, label, icon: Icon }) => {
              const isActive = activeCategory === id;
              const count = categoryCounts[id] || 0;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveCategory(id)}
                  className={cn(
                    "active-bounce flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-200",
                    isActive
                      ? "bg-white text-[#120D22] shadow-sm font-bold"
                      : "bg-white/10 text-white/80 hover:bg-white/15 hover:text-white border border-white/10",
                  )}
                >
                  <Icon size={13} />
                  <span>{label}</span>
                  <span
                    className={cn(
                      "ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                      isActive ? "bg-[#120D22] text-white" : "bg-white/20 text-white",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Push Notification Opt-in / Status Banner */}
        <PushNotificationBanner />

        {/* Desktop Search */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-border-default bg-bg-surface pl-10 pr-4 text-xs font-medium text-text-primary placeholder:text-text-secondary focus:border-brand-500 focus:outline-none transition-colors"
              />
            </div>
            <span className="text-xs text-text-secondary font-medium">
              Showing {filteredNotifications.length} of {notifications.length}
            </span>
          </div>
        )}

        {/* Desktop Content */}
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-bad-border/40 bg-bad-bg/10 p-8 text-center shadow-xs">
            <p className="text-sm font-semibold text-bad-fg">Couldn't load notifications at this moment.</p>
            <Button size="sm" variant="outline" onClick={() => void refetch()} className="mt-3 text-xs">
              Try Again
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-border-default bg-bg-surface p-12 text-center shadow-sm">
            <div className="relative mb-6 flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-[#6D28D9]/20 to-[#8B5CF6]/20 text-[#8B5CF6] ring-8 ring-[#6D28D9]/10 shadow-lg">
              <BellRing size={36} className="animate-bounce" />
            </div>

            <h2 className="font-display text-2xl font-bold text-text-primary">
              You're All Caught Up! 🎉
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
              There are no pending notifications for your account. You will receive real-time updates as soon as installments are due, auction winners are finalized, or payout receipts are generated.
            </p>

            <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-3 text-left">
              <div className="rounded-2xl border border-border-default bg-bg-raised p-4 transition-all hover:border-brand-300">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500 mb-2.5">
                  <Calendar size={18} />
                </div>
                <p className="font-display text-xs font-bold text-text-primary">Installment Dues</p>
                <p className="mt-1 text-[11px] text-text-secondary leading-normal">
                  Timely reminders for upcoming cycle dues and automated receipts.
                </p>
              </div>

              <div className="rounded-2xl border border-border-default bg-bg-raised p-4 transition-all hover:border-brand-300">
                <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 mb-2.5">
                  <Trophy size={18} />
                </div>
                <p className="font-display text-xs font-bold text-text-primary">Winner Announcements</p>
                <p className="mt-1 text-[11px] text-text-secondary leading-normal">
                  Cycle bid results, lucky draw winners, and calculated dividends.
                </p>
              </div>

              <div className="rounded-2xl border border-border-default bg-bg-raised p-4 transition-all hover:border-brand-300">
                <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500 mb-2.5">
                  <ShieldCheck size={18} />
                </div>
                <p className="font-display text-xs font-bold text-text-primary">Prize Disbursements</p>
                <p className="mt-1 text-[11px] text-text-secondary leading-normal">
                  Digital payment vouchers &amp; direct prize money settlement notices.
                </p>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <Link to="/dashboard">
                <Button size="md" className="rounded-2xl font-semibold gap-2">
                  <Zap size={15} /> Go to Dashboard
                </Button>
              </Link>
              <Link to="/chit-groups">
                <Button size="md" variant="outline" className="rounded-2xl font-semibold gap-2">
                  <Landmark size={15} /> My Chit Groups
                </Button>
              </Link>
            </div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border-default bg-bg-surface p-12 text-center">
            <p className="font-display text-base font-bold text-text-primary">No matching notifications</p>
            <p className="mt-1 text-xs text-text-secondary">Try switching your category filter or clearing your search query.</p>
            <Button size="sm" variant="outline" onClick={() => { setActiveCategory("ALL"); setSearchQuery(""); }} className="mt-4 text-xs">
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredNotifications.map((notification) => {
              const config = getTypeConfig(notification.type);
              const Icon = config.icon;
              const title = notification.subject || config.label;

              return (
                <div
                  key={notification.id}
                  onClick={() => setSelectedNotification(notification)}
                  className="group relative flex cursor-pointer items-start gap-4 rounded-2xl border border-border-default bg-bg-surface p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md active-bounce"
                >
                  <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105 shadow-xs", config.iconBg, config.iconFg)}>
                    <Icon size={22} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display text-base font-bold text-text-primary group-hover:text-accent-primary transition-colors">
                          {title}
                        </h3>
                        {getChannelBadge(notification.channel)}
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-text-secondary tabular-nums">
                        {formatDateTime(notification.createdAt)}
                      </span>
                    </div>

                    <p className="mt-1.5 text-sm leading-relaxed text-text-secondary line-clamp-2">
                      {notification.body}
                    </p>

                    <div className="mt-3 flex items-center justify-between border-t border-border-default/60 pt-2.5 text-[11px] text-text-secondary">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-text-primary">{humanize(notification.type)}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-good-fg font-semibold">
                          <CheckCircle2 size={12} /> Delivered
                        </span>
                      </div>

                      <div className="flex items-center gap-1 font-semibold text-accent-primary group-hover:translate-x-0.5 transition-transform">
                        <span>View details</span>
                        <ChevronRight size={13} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Interactive Detail Dialog (Universal) ── */}
      <Dialog open={Boolean(selectedNotification)} onOpenChange={(open: boolean) => !open && setSelectedNotification(null)}>
        <DialogContent className="max-w-lg rounded-3xl p-5 sm:p-6">
          <DialogHeader>
            {selectedNotification && (
              <div className="flex items-center gap-3 mb-2">
                {(() => {
                  const cfg = getTypeConfig(selectedNotification.type);
                  const Icon = cfg.icon;
                  return (
                    <div className={cn("flex size-10 sm:size-11 items-center justify-center rounded-2xl", cfg.iconBg, cfg.iconFg)}>
                      <Icon size={20} />
                    </div>
                  );
                })()}
                <div className="min-w-0 flex-1">
                  <DialogTitle className="font-display text-base sm:text-lg font-bold text-text-primary truncate">
                    {selectedNotification.subject || getTypeConfig(selectedNotification.type).label}
                  </DialogTitle>
                  <DialogDescription className="text-[11px] sm:text-xs text-text-secondary mt-0.5">
                    {formatDateTime(selectedNotification.createdAt)}
                  </DialogDescription>
                </div>
              </div>
            )}
          </DialogHeader>

          {selectedNotification ? (
            <div className="mt-3 sm:mt-4 flex flex-col gap-3.5 sm:gap-4">
              {/* Message Content Box */}
              <div className="rounded-2xl border border-border-default bg-bg-raised p-4 sm:p-5 shadow-xs">
                <p className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-text-primary select-text">
                  {selectedNotification.body}
                </p>
              </div>

              {/* Delivery Metadata Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-xl border border-border-default bg-bg-surface p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Channel</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    {getChannelBadge(selectedNotification.channel)}
                  </div>
                </div>

                <div className="rounded-xl border border-border-default bg-bg-surface p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Status</p>
                  <p className="mt-1 font-semibold text-good-fg flex items-center gap-1 text-[11px]">
                    <CheckCircle2 size={12} /> Delivered
                  </p>
                </div>
              </div>

              {/* Quick Navigation Links */}
              <div className="mt-1 flex items-center justify-end gap-2 border-t border-border-default pt-3.5">
                <Link to="/chit-groups" className="flex-1 sm:flex-initial">
                  <Button size="sm" variant="outline" className="w-full text-xs rounded-xl gap-1">
                    <Landmark size={13} /> Schemes
                  </Button>
                </Link>
                <Link to="/auctions" className="flex-1 sm:flex-initial">
                  <Button size="sm" className="w-full text-xs rounded-xl gap-1">
                    <Gavel size={13} /> Live Auctions
                  </Button>
                </Link>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
