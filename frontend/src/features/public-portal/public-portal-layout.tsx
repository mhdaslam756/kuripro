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
        <Skeleton className="h-16 w-80 rounded-2xl" />
        <Skeleton className="mt-6 h-96 w-full max-w-lg rounded-3xl" />
      </div>
    );
  }

  if (isError || !org) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-surface p-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-bad-bg/15 text-bad-fg mb-4">
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
    <div className="min-h-screen bg-gradient-to-b from-brand-50/50 via-bg-surface to-bg-surface flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-border-default/80 bg-bg-surface/80 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            {org.logoUrl ? (
              <img src={org.logoUrl} alt={org.name} className="size-10 rounded-xl object-cover shadow-xs" />
            ) : (
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-100 font-display text-lg font-bold text-accent-primary shadow-xs">
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
      <main className="flex-1 flex flex-col justify-center py-8 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-xl">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-default/60 py-4 text-center text-xs text-text-secondary">
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
