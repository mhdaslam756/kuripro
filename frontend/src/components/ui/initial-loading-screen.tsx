import { Loader2, ShieldCheck, Sparkles } from "lucide-react";

export function InitialLoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex min-h-[100dvh] flex-col items-center justify-between bg-bg-app px-6 py-12 select-none">
      {/* Top subtle badge */}
      <div className="pt-safe flex items-center gap-1.5 rounded-full border border-border-default/80 bg-bg-surface px-3 py-1 text-xs font-semibold text-text-secondary shadow-xs animate-in fade-in zoom-in duration-300">
        <ShieldCheck className="size-3.5 text-accent-primary" />
        <span>KuriPro Fintech</span>
      </div>

      {/* Center Animated Logo & Branding */}
      <div className="flex flex-col items-center text-center">
        {/* Pulsing Outer Ring Container */}
        <div className="relative mb-6 flex items-center justify-center">
          <div className="absolute size-24 rounded-3xl bg-accent-primary/20 blur-xl animate-pulse" />
          <div className="relative flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#102D30] via-[#173B3F] to-[#0D2224] font-display text-3xl font-bold text-white shadow-2xl ring-4 ring-amber-400/20 active-bounce">
            K
          </div>
        </div>

        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
          KuriPro
        </h1>
        <p className="mt-1.5 text-xs font-medium text-text-secondary sm:text-sm">
          Securing workspace & initializing session…
        </p>

        {/* Animated Loading Bar */}
        <div className="mt-6 flex w-48 flex-col items-center gap-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-default">
            <div className="h-full w-full origin-left bg-gradient-to-r from-accent-primary via-amber-400 to-accent-primary animate-[shimmer_1.5s_infinite_linear]" />
          </div>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-text-disabled">
            <Loader2 className="size-3 animate-spin text-accent-primary" /> Please wait
          </span>
        </div>
      </div>

      {/* Bottom Security Footer */}
      <div className="pb-safe flex items-center gap-1 text-[11px] font-medium text-text-disabled">
        <Sparkles size={12} className="text-amber-500" /> Powered by KuriPro Encrypted Core
      </div>
    </div>
  );
}
