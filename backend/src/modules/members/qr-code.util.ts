import { randomBytes } from "node:crypto";

import QRCode from "qrcode";

/** Opaque, unguessable token embedded in a member's QR code — see `member.model.ts`'s `qrToken`. */
export function generateQrToken(): string {
  return randomBytes(24).toString("hex");
}

/** Renders the member's QR code as a data: URL PNG the frontend can drop straight into an <img>. */
export async function generateQrDataUrl(qrToken: string): Promise<string> {
  return QRCode.toDataURL(JSON.stringify({ t: qrToken }), { margin: 1, width: 320 });
}
