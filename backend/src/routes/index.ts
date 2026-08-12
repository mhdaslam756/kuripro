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
import { publicRouter } from "../modules/public/public.routes.js";
import { tenantRouter } from "../modules/tenants/tenant.routes.js";
import { usersRouter } from "../modules/users/users.routes.js";
import { uploadsRouter } from "../uploads/upload.routes.js";

/**
 * Main API Router aggregating all feature routes under /api.
 */
export const apiRouter: Router = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/public", publicRouter);
apiRouter.use("/super-admin", superAdminRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/chit-groups", chitGroupRouter);
apiRouter.use("/members", memberRouter);
apiRouter.use("/collections", collectionRouter);
apiRouter.use("/auctions", auctionRouter);
apiRouter.use("/payouts", payoutRouter);
apiRouter.use("/finance", financeRouter);
apiRouter.use("/reports", reportRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/notifications", notificationRouter);
apiRouter.use("/devices", deviceRouter);
apiRouter.use("/uploads", uploadsRouter);
apiRouter.use("/activity-logs", activityLogRouter);
apiRouter.use("/roles", roleRouter);
apiRouter.use("/permissions", permissionRouter);
apiRouter.use("/organization", tenantRouter);
apiRouter.use("/branches", branchRouter);
