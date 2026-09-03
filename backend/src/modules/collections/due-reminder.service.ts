import { Types } from "mongoose";
import { formatPaiseAsINR } from "../../utils/money.js";
import { findChitGroupById } from "../chit-groups/chit-group.repository.js";
import { Payment } from "../payments/payment.model.js";
import { sendSingle } from "../notifications/notification.service.js";
import type { SendDueRemindersInput } from "./due-reminder.validators.js";

export interface SendDueRemindersResult {
  queued: number;
  skipped: number;
  total: number;
  remindedMembers: string[];
}

export async function sendDueReminders(
  tenantId: string,
  actorUserId: string,
  input: SendDueRemindersInput,
): Promise<SendDueRemindersResult> {
  const query: Record<string, any> = {
    tenantId: new Types.ObjectId(tenantId),
    status: { $in: input.onlyOverdue ? ["OVERDUE"] : ["PENDING", "PARTIAL", "OVERDUE"] },
  };

  if (input.paymentIds && input.paymentIds.length > 0) {
    query._id = { $in: input.paymentIds.map((id) => new Types.ObjectId(id)) };
  } else {
    if (input.chitGroupId) {
      query.chitGroupId = new Types.ObjectId(input.chitGroupId);
    }
    if (input.chitCycleId) {
      query.chitCycleId = new Types.ObjectId(input.chitCycleId);
    }
  }

  const installments = await Payment.find(query)
    .populate<{
      chitGroupId: { name: string };
      chitMembershipId: {
        ticketNumber: number;
        subTicket?: string;
        shareType?: string;
        share?: number;
        memberId: { _id: Types.ObjectId; name: string; memberCode: string; phone: string; email?: string };
      };
    }>([
      { path: "chitGroupId", select: "name" },
      {
        path: "chitMembershipId",
        select: "ticketNumber subTicket shareType share memberId",
        populate: { path: "memberId", select: "name memberCode phone email" },
      },
    ])
    .lean();

  if (installments.length === 0) {
    return { queued: 0, skipped: 0, total: 0, remindedMembers: [] };
  }

  let groupName = "Chit Group";
  if (input.chitGroupId) {
    const grp = await findChitGroupById(input.chitGroupId, tenantId);
    if (grp) groupName = grp.name;
  }

  let queued = 0;
  let skipped = 0;
  const remindedMembers: string[] = [];
  // Deduplicate by memberId so a member with multiple due installments gets 1 consolidated or distinct alert
  const processedMembers = new Set<string>();

  for (const inst of installments) {
    const membership = inst.chitMembershipId;
    if (!membership || !membership.memberId) {
      skipped++;
      continue;
    }

    const member = membership.memberId;
    const memberIdStr = member._id.toString();
    const instGroupName = (inst.chitGroupId as any)?.name || groupName;
    const outstanding = Math.max(0, inst.amountDue - inst.amountPaid);
    const formattedAmount = formatPaiseAsINR(outstanding);
    const formattedDueDate = new Date(inst.dueDate).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const defaultSubject = `Payment Due: ${instGroupName}`;
    const defaultBody = `Dear {{memberName}}, dues of ${formattedAmount} for ${instGroupName} are due on ${formattedDueDate}. Kindly pay on time.`;

    const subject = input.subject?.trim() || defaultSubject;
    const body = input.body?.trim() || defaultBody;

    try {
      const res = await sendSingle(tenantId, actorUserId, {
        memberId: memberIdStr,
        channel: input.channel,
        type: "REMINDER",
        subject,
        body,
        context: {
          chitGroupName: instGroupName,
          amount: formattedAmount,
          dueDate: formattedDueDate,
        },
      });

      if (res.queued > 0) {
        queued += res.queued;
        if (!processedMembers.has(memberIdStr)) {
          processedMembers.add(memberIdStr);
          remindedMembers.push(member.name);
        }
      } else {
        skipped++;
      }
    } catch {
      skipped++;
    }
  }

  return { queued, skipped, total: installments.length, remindedMembers };
}
