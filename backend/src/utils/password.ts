import { randomInt } from "node:crypto";

import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export function hashPassword(plainTextPassword: string): Promise<string> {
  return bcrypt.hash(plainTextPassword, SALT_ROUNDS);
}

export function verifyPassword(plainTextPassword: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, passwordHash);
}

const UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O — visually ambiguous with 1/0
const LOWERCASE = "abcdefghijkmnpqrstuvwxyz"; // no l/o
const DIGITS = "23456789"; // no 0/1
const TEMP_PASSWORD_LENGTH = 12;

function randomChar(charset: string): string {
  return charset[randomInt(charset.length)] as string;
}

/**
 * Generates a temporary password for organizer/staff-issued accounts (new members, staff).
 * Satisfies the same policy enforced at signup (10+ chars, upper/lower/digit) so the recipient
 * can log in immediately; `mustChangePassword` then forces them to set their own.
 */
export function generateTemporaryPassword(): string {
  const required = [randomChar(UPPERCASE), randomChar(LOWERCASE), randomChar(DIGITS)];
  const fullCharset = UPPERCASE + LOWERCASE + DIGITS;
  const rest = Array.from({ length: TEMP_PASSWORD_LENGTH - required.length }, () => randomChar(fullCharset));

  const chars = [...required, ...rest];
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j] as string, chars[i] as string];
  }
  return chars.join("");
}
