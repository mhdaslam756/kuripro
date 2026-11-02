import { Types } from "mongoose";

import { Payment } from "../payments/payment.model.js";
import { AppError } from "../../utils/app-error.js";
import { findMemberById } from "../members/member.repository.js";
import { ChitMembership } from "./chit-membership.model.js";
import type { ChitGroupDocument } from "./chit-group.model.js";

/** Every chit group a member is in (or was in), with their ticket and what they have paid and still owe. */
export async function listMemberChitGroups(tenantId: string, memberId: string) {
  const member = await findMemberById(memberId, tenantId);
  if (!member) throw AppError.notFound("Member not found");

  const memberships = await ChitMembership.find({ tenantId, memberId })
    .sort({ joinedAt: -1 })
    .populate<{ chitGroupId: ChitGroupDocument | null }>({ path: "chitGroupId" });

  const totals = await Payment.aggregate<{
    _id: Types.ObjectId;
    totalDue: number;
    totalPaid: number;
    overdue: number;
    nextDueDate: Date | null;
  }>([
    { $match: { tenantId: new Types.ObjectId(tenantId), chitMembershipId: { $in: memberships.map((m) => m._id) } } },
    {
      $group: {
        _id: "$chitMembershipId",
        totalDue: { $sum: { $cond: [{ $eq: ["$status", "WAIVED"] }, 0, "$amountDue"] } },
        totalPaid: { $sum: "$amountPaid" },
        overdue: { $sum: { $cond: [{ $eq: ["$status", "OVERDUE"] }, { $subtract: ["$amountDue", "$amountPaid"] }, 0] } },
        nextDueDate: {
          $min: { $cond: [{ $in: ["$status", ["PENDING", "PARTIAL", "OVERDUE"]] }, "$dueDate", null] },
        },
      },
    },
  ]);
  const byMembership = new Map(totals.map((t) => [t._id.toString(), t]));

  return {
    items: memberships
      .filter((m) => m.chitGroupId)
      .map((m) => {
        const g = m.chitGroupId!;
        const t = byMembership.get(m._id.toString());
        return {
          membershipId: m._id.toString(),
          status: m.status,
          ticketNumber: m.ticketNumber,
          subTicket: m.subTicket ?? null,
          shareType: m.shareType,
          hasWon: m.hasWon,
          fromCycleNumber: m.effectiveFromCycleNumber ?? 1,
          toCycleNumber: m.status === "EXITED" ? (m.lastCycleNumber ?? null) : null,
          joinedAt: m.joinedAt,
          group: {
            id: g._id.toString(),
            name: g.name,
            status: g.status,
            chitValue: g.chitValue,
            installmentAmount: g.installmentAmount,
            totalMembers: g.totalMembers,
            currentCycleNumber: g.currentCycleNumber,
          },
          account: {
            totalDue: t?.totalDue ?? 0,
            totalPaid: t?.totalPaid ?? 0,
            balance: Math.max(0, (t?.totalDue ?? 0) - (t?.totalPaid ?? 0)),
            overdue: t?.overdue ?? 0,
            nextDueDate: t?.nextDueDate ?? null,
          },
        };
      }),
  };
}
