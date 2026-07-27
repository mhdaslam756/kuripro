import { Router } from "express";

import { activityLogRouter } from "../modules/activity-logs/activity-log.routes.js";
import { authRouter } from "../modules/auth/auth.routes.js";
import { branchRouter } from "../modules/branches/branch.routes.js";
import { auctionRouter } from "../modules/auctions/auction.routes.js";
import { chitGroupRouter } from "../modules/chit-groups/chit-group.routes.js";
import { collectionRouter } from "../modules/collections/collection.routes.js";
import { dashboardRouter } from "../modules/dashboard/dashboard.routes.js";
import { deviceRouter } from "../modules/devices/device.routes.js";
import { financeRouter } from "../modules/finance/finance.routes.js";
import { memberRouter } from "../modules/members/member.routes.js";
import { notificationRouter } from "../modules/notifications/notification.routes.js";
import { payoutRouter } from "../modules/payouts/payout.routes.js";
import { permissionRouter } from "../modules/permissions/permission.routes.js";
import { reportRouter } from "../modules/reports/report.routes.js";
import { roleRouter } from "../modules/roles/role.routes.js";
import superAdminRouter from "../modules/super-admin/super-admin.routes.js";
import { tenantRouter } from "../modules/tenants/tenant.routes.js";
import { usersRouter } from "../modules/users/users.routes.js";
import { uploadsRouter } from "../uploads/upload.routes.js";

/**
 * Every versioned route lives under one aggregator so a future v2 is a new sibling file and a
 * one-line mount in app.ts — never a change to v1's own code.
 */
export const v1Router: Router = Router();

v1Router.use("/auth", authRouter);
v1Router.use("/super-admin", superAdminRouter);
v1Router.use("/users", usersRouter);
v1Router.use("/chit-groups", chitGroupRouter);
v1Router.use("/members", memberRouter);
v1Router.use("/collections", collectionRouter);
v1Router.use("/auctions", auctionRouter);
v1Router.use("/payouts", payoutRouter);
v1Router.use("/finance", financeRouter);
v1Router.use("/reports", reportRouter);
v1Router.use("/dashboard", dashboardRouter);
v1Router.use("/notifications", notificationRouter);
v1Router.use("/devices", deviceRouter);
v1Router.use("/uploads", uploadsRouter);
v1Router.use("/activity-logs", activityLogRouter);
v1Router.use("/roles", roleRouter);
v1Router.use("/permissions", permissionRouter);
v1Router.use("/organization", tenantRouter);
v1Router.use("/branches", branchRouter);
