import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const WINNER_SELECTION_METHODS = ["LOWEST_BID", "MANUAL", "LOTTERY"] as const;
export type WinnerSelectionMethod = (typeof WINNER_SELECTION_METHODS)[number];

export const recordBidSchema = z.object({
  chitMembershipId: objectId,
  /** Rupees the member offers to forgo from the pot — converted to paise at the service boundary. */
  discountRupees: z.number().positive(),
});

export type RecordBidInput = z.infer<typeof recordBidSchema>;

export const settleSchema = z
  .object({
    method: z.enum(WINNER_SELECTION_METHODS),
    /** Required for MANUAL selection — the membership declared as winner. */
    winnerMembershipId: objectId.optional(),
    /** Optional for MANUAL — honour a specific recorded bid's discount instead of a commission-only prize. */
    winningBidId: objectId.optional(),
  })
  .refine((data) => data.method !== "MANUAL" || data.winnerMembershipId !== undefined, {
    message: "winnerMembershipId is required for MANUAL winner selection",
    path: ["winnerMembershipId"],
  });

export type SettleInput = z.infer<typeof settleSchema>;

export const repickSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type RepickInput = z.infer<typeof repickSchema>;
