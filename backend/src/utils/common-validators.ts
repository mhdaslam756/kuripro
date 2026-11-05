import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const MOBILE_NUMBER_MESSAGE = "Enter a 10-digit mobile number";

/** Spaces and dashes typed for readability are ignored; what remains must be exactly ten digits. */
const stripMobileFormatting = (value: unknown): unknown => (typeof value === "string" ? value.replace(/[\s-]/g, "") : value);

/** A person's mobile number: exactly 10 digits, nothing else (no +91, no letters). Stored as digits only. */
export const mobileNumberSchema = z.preprocess(stripMobileFormatting, z.string().regex(/^\d{10}$/, MOBILE_NUMBER_MESSAGE));

/** Same rule for a number that may be left blank. */
export const optionalMobileNumberSchema = z.preprocess(
  (value) => {
    const stripped = stripMobileFormatting(value);
    return typeof stripped === "string" && stripped === "" ? undefined : stripped;
  },
  z.string().regex(/^\d{10}$/, MOBILE_NUMBER_MESSAGE).optional(),
);

/**
 * Email inputs that are looked up against stored users. The User schema lowercases `email` on write,
 * so a raw mixed-case input would never match an existing row — normalize at the boundary instead.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.string().email());

/** Validates a route param that must be a MongoDB ObjectId-shaped string (24 hex chars). */
export const mongoIdParamSchema = z.object({
  id: objectId,
});

export type MongoIdParam = z.infer<typeof mongoIdParamSchema>;

export const paymentIdParamSchema = z.object({
  paymentId: objectId,
});

export type PaymentIdParam = z.infer<typeof paymentIdParamSchema>;

/** Validates a two-level nested resource route: `/:id/<child>/:childId`. */
export const nestedMongoIdParamSchema = z.object({
  id: objectId,
  childId: objectId,
});

export type NestedMongoIdParam = z.infer<typeof nestedMongoIdParamSchema>;
