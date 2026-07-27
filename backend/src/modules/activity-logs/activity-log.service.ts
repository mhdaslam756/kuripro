import { logger } from "../../config/logger.js";
import type { PaginatedResult, PaginationQuery } from "../../utils/pagination.js";
import type { ObjectIdLike } from "../../utils/mongoose-helpers.js";
import { createActivityLog, listActivityLogs } from "./activity-log.repository.js";
import type { ActivityLogAction, ActivityLogDocument } from "./activity-log.model.js";

export interface RecordActivityInput {
  tenantId: ObjectIdLike | null;
  userId: ObjectIdLike;
  memberId?: ObjectIdLike;
  action: ActivityLogAction;
  message: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Best-effort side channel: a failure here must never fail the request it describes (a login
 * shouldn't 500 because the audit write hiccuped), so errors are logged and swallowed rather
 * than thrown. Safe to `await` directly — it will not reject.
 */
export async function recordActivity(input: RecordActivityInput): Promise<void> {
  try {
    await createActivityLog(input);
  } catch (error) {
    logger.error({ err: error, action: input.action }, "Failed to record activity log");
  }
}

export async function listUserActivity(
  tenantId: ObjectIdLike | null,
  userId: ObjectIdLike,
  query: PaginationQuery,
): Promise<PaginatedResult<ActivityLogDocument>> {
  return listActivityLogs({ tenantId, userId }, query);
}

export async function listTenantActivity(
  tenantId: ObjectIdLike,
  query: PaginationQuery,
): Promise<PaginatedResult<ActivityLogDocument>> {
  return listActivityLogs({ tenantId }, query);
}

export async function listMemberActivity(
  tenantId: ObjectIdLike,
  memberId: ObjectIdLike,
  query: PaginationQuery,
): Promise<PaginatedResult<ActivityLogDocument>> {
  return listActivityLogs({ tenantId, memberId }, query);
}
