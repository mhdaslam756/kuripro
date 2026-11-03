import { Building2, Mail, Phone, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { useParams } from "react-router-dom";

import { Skeleton } from "@/components/ui/skeleton";
import { usePublicOrg } from "./use-public-portal";

export function PublicPortalLayout({ children }: { children: ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const { data: org, isLoading, isError } = usePublicOrg(slug);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-surface p-4">
        <Skeleton className="h-16 w-80 rounded-md" />
        <Skeleton className="mt-6 h-96 w-full max-w-lg rounded-lg" />
      </div>
    );
  }

  if (isError || !org) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-surface p-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-md bg-bad-bg/15 text-bad-fg mb-4">
          <Building2 size={28} />
        </div>
        <h1 className="font-display text-2xl font-bold text-text-primary">Organization Not Found</h1>
        <p className="mt-2 text-sm text-text-secondary max-w-md">
          The organization link you opened does not exist or may be inactive. Please check the URL and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg-app flex flex-col font-sans">
      {/* Phone: app-style hero with the organization's identity; the form sheet slides up over it */}
      <section className="relative overflow-hidden bg-[linear-gradient(160deg,#3b1585_0%,#5b21b6_48%,#7c3aed_100%)] px-6 pb-20 pt-[max(2.5rem,env(safe-area-inset-top))] text-center text-white sm:hidden">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-20 bottom-0 size-48 rounded-full bg-fuchsia-400/15 blur-3xl" />
        <div className="relative flex flex-col items-center gap-3">
          {org.logoUrl ? (
            <img src={org.logoUrl} alt={org.name} className="size-20 rounded-3xl border border-white/30 bg-white object-cover shadow-xl" />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-3xl border border-white/30 bg-white/15 font-display text-3xl font-extrabold backdrop-blur">
              {org.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight">{org.name}</h1>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-xs font-medium text-white/80">
              <ShieldCheck size={14} /> Verified chit organization · {org.address.city}
            </p>
          </div>
        </div>
      </section>

      {/* Header */}
      <header className="hidden border-b border-border-default/80 bg-bg-surface/80 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            {org.logoUrl ? (
              <img src={org.logoUrl} alt={org.name} className="size-10 rounded-sm object-cover" />
            ) : (
              <div className="flex size-10 items-center justify-center rounded-sm bg-brand-100 font-display text-lg font-bold text-accent-primary">
                {org.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-display text-base font-bold text-text-primary leading-tight">{org.name}</h1>
              <p className="text-xs text-text-secondary flex items-center gap-1">
                <ShieldCheck size={13} className="text-good-fg" /> Verified Chit Organization · {org.address.city}, {org.address.state}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-xs text-text-secondary">
            {org.contactPhone ? (
              <a href={`tel:${org.contactPhone}`} className="flex items-center gap-1.5 hover:text-accent-primary transition-colors">
                <Phone size={13} /> {org.contactPhone}
              </a>
            ) : null}
            {org.contactEmail ? (
              <a href={`mailto:${org.contactEmail}`} className="flex items-center gap-1.5 hover:text-accent-primary transition-colors">
                <Mail size={13} /> {org.contactEmail}
              </a>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        className={[
          "flex flex-1 flex-col justify-center px-4 py-6 sm:px-6 sm:py-10",
          // Phone: a rounded sheet over the hero, with larger touch-friendly fields
          "max-sm:relative max-sm:-mt-10 max-sm:justify-start max-sm:rounded-t-[32px] max-sm:bg-bg-app max-sm:px-5 max-sm:pb-8 max-sm:pt-7 max-sm:shadow-[0_-12px_30px_-12px_rgba(76,29,149,0.35)]",
          "max-sm:[&_input]:h-12 max-sm:[&_input]:rounded-xl max-sm:[&_input]:text-base",
        ].join(" ")}
      >
        <div className="mx-auto w-full max-w-xl">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-default/60 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-xs text-text-secondary max-sm:border-0 max-sm:bg-bg-app">
        <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} {org.name}. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Powered by <strong className="font-semibold text-text-primary">KuriPro</strong> Chit Fund Management
          </p>
        </div>
      </footer>
    </div>
  );
}
