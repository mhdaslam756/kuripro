import { buildPaginatedResult, toSkipLimit, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import type { ObjectIdLike } from "../../utils/mongoose-helpers.js";
import { ActivityLog, type ActivityLogAction, type ActivityLogDoc, type ActivityLogDocument } from "./activity-log.model.js";

export type CreateActivityLogInput = Omit<ActivityLogDoc, "createdAt" | "updatedAt" | "tenantId" | "userId" | "memberId"> & {
  tenantId: ObjectIdLike | null;
  userId: ObjectIdLike;
  memberId?: ObjectIdLike;
};

export async function createActivityLog(data: CreateActivityLogInput): Promise<ActivityLogDocument> {
  return ActivityLog.create(data);
}

export interface ListActivityLogsFilter {
  tenantId: ObjectIdLike | null;
  userId?: ObjectIdLike;
  memberId?: ObjectIdLike;
  action?: ActivityLogAction;
}

export async function listActivityLogs(
  filter: ListActivityLogsFilter,
  query: PaginationQuery,
): Promise<PaginatedResult<ActivityLogDocument>> {
  const mongoFilter = {
    tenantId: filter.tenantId,
    ...(filter.userId ? { userId: filter.userId } : {}),
    ...(filter.memberId ? { memberId: filter.memberId } : {}),
    ...(filter.action ? { action: filter.action } : {}),
  };
  const { skip, limit } = toSkipLimit(query);

  const [items, total] = await Promise.all([
    ActivityLog.find(mongoFilter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ActivityLog.countDocuments(mongoFilter),
  ]);

  return buildPaginatedResult(items, total, query);
}
