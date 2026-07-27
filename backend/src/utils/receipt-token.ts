import { randomBytes } from "node:crypto";

import QRCode from "qrcode";

/** Opaque token embedded in a receipt/voucher QR code, used to verify or look it up on scan. */
export function generateReceiptToken(): string {
  return randomBytes(20).toString("hex");
}

/**
 * Renders a receipt/voucher QR as a data: URL PNG. It encodes only the verification token (not the
 * amount) so a scan resolves to the authoritative server-side record rather than trusting embedded
 * data. Shared by collection receipts and prize-payout vouchers.
 */
export async function generateReceiptQrDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(JSON.stringify({ r: token }), { margin: 1, width: 280 });
}
