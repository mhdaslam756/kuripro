import { Navigate, Route, Routes } from "react-router-dom";

import { LoginPage } from "@/features/auth/login-page";
import { RegisterPage } from "@/features/auth/register-page";
import { SuperAdminLoginPage } from "@/features/super-admin/super-admin-login-page";
import { SuperAdminDashboardPage } from "@/features/super-admin/super-admin-dashboard-page";
import { BranchesPage } from "@/features/branches/branches-page";
import { ChitGroupDetailPage } from "@/features/chit-groups/chit-group-detail-page";
import { ChitGroupsPage } from "@/features/chit-groups/chit-groups-page";
import { AuctionsPage } from "@/features/auctions/auctions-page";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { DevicePage } from "@/features/device/device-page";
import { CollectionsPage } from "@/features/collections/collections-page";
import { PayoutsPage } from "@/features/payouts/payouts-page";
import { ReportsPage } from "@/features/reports/reports-page";
import { MemberDetailPage } from "@/features/members/member-detail-page";
import { MembersPage } from "@/features/members/members-page";
import { NotificationsPage } from "@/features/notifications/notifications-page";
import { OrganizationPage } from "@/features/organization/organization-page";
import { RolesPage } from "@/features/roles/roles-page";
import { MemberRegisterPage } from "@/features/public-portal/member-register-page";
import { MemberLoginPage } from "@/features/public-portal/member-login-page";
import { ProtectedRoute } from "@/routes/protected-route";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/portal/:slug/register" element={<MemberRegisterPage />} />
      <Route path="/portal/:slug/login" element={<MemberLoginPage />} />
      <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />
      <Route
        path="/super-admin/dashboard"
        element={
          <ProtectedRoute>
            <SuperAdminDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organization"
        element={
          <ProtectedRoute>
            <OrganizationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/branches"
        element={
          <ProtectedRoute>
            <BranchesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/members"
        element={
          <ProtectedRoute>
            <MembersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/members/:id"
        element={
          <ProtectedRoute>
            <MemberDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chit-groups"
        element={
          <ProtectedRoute>
            <ChitGroupsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chit-groups/:id"
        element={
          <ProtectedRoute>
            <ChitGroupDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/collections"
        element={
          <ProtectedRoute>
            <CollectionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/auctions"
        element={
          <ProtectedRoute>
            <AuctionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payouts"
        element={
          <ProtectedRoute>
            <PayoutsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/roles"
        element={
          <ProtectedRoute>
            <RolesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/device"
        element={
          <ProtectedRoute>
            <DevicePage />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
