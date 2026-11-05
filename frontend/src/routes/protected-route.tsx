import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { InitialLoadingScreen } from "@/components/ui/initial-loading-screen";
import { AppShell } from "@/components/layout/app-shell";
import { FirstLoginModal } from "@/features/auth/components/first-login-modal";
import { useAuth } from "@/lib/auth-context";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading, updateUser } = useAuth();

  if (isLoading) {
    return <InitialLoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // A login created for someone (staff-added or imported member, an invite) starts with a temporary password.
  // Whatever way they signed in — password, portal link, switched account, or a session resumed later — they
  // must choose their own before using the app. Platform admins have their own flow.
  const mustChangePassword = Boolean(user.mustChangePassword) && user.role?.slug !== "SUPER_ADMIN";

  return (
    <>
      <AppShell>{children}</AppShell>
      <FirstLoginModal open={mustChangePassword} onPasswordChanged={() => updateUser({ mustChangePassword: false })} />
    </>
  );
}
