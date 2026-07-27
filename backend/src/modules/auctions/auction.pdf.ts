import PDFDocument from "pdfkit";

import { formatPaiseAsINR } from "../../utils/money.js";

export interface MinutesData {
  organizationName: string;
  chitGroupName: string;
  registrationNumber: string;
  cycleNumber: number;
  auctionDate: Date;
  allotmentMethod: string;
  totalMembers: number;
  potAmount: number;
  discountAmount: number;
  commissionAmount: number;
  dividendPerMember: number;
  prizeAmount: number;
  winner: { name: string; memberCode: string; ticketNumber: number };
  bids: { ticketNumber: number; memberName: string; discountAmount: number }[];
}

export interface WinnerVoucherData {
  organizationName: string;
  chitGroupName: string;
  registrationNumber: string;
  cycleNumber: number;
  auctionDate: Date;
  prizeAmount: number;
  winner: { name: string; memberCode: string; ticketNumber: number; phone: string };
}

const BRASS = "#8a6d3b";
const INK = "#2b2b2b";
const MUTED = "#6b6b6b";

function renderToBuffer(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 56 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    build(doc);
    doc.end();
  });
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function heading(doc: PDFKit.PDFDocument, org: string, title: string): void {
  doc.fillColor(BRASS).font("Helvetica-Bold").fontSize(20).text(org, { align: "center" });
  doc.moveDown(0.2);
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(13).text(title, { align: "center" });
  doc.moveDown(0.4);
  const y = doc.y;
  doc.moveTo(56, y).lineTo(doc.page.width - 56, y).strokeColor(BRASS).lineWidth(1).stroke();
  doc.moveDown(0.8);
}

function labelValue(doc: PDFKit.PDFDocument, label: string, value: string): void {
  doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(label, { continued: true });
  doc.font("Helvetica-Bold").fillColor(INK).text(`  ${value}`);
  doc.moveDown(0.25);
}

export function generateMinutesPdf(data: MinutesData): Promise<Buffer> {
  return renderToBuffer((doc) => {
    heading(doc, data.organizationName, "Chit Auction Minutes");

    labelValue(doc, "Chit group:", `${data.chitGroupName}  (Reg. ${data.registrationNumber})`);
    labelValue(doc, "Auction (cycle):", `#${data.cycleNumber}`);
    labelValue(doc, "Date:", fmtDate(data.auctionDate));
    labelValue(doc, "Allotment method:", data.allotmentMethod);
    labelValue(doc, "Total members:", String(data.totalMembers));
    doc.moveDown(0.6);

    doc.font("Helvetica-Bold").fontSize(12).fillColor(BRASS).text("Settlement");
    doc.moveDown(0.3);
    labelValue(doc, "Chit value (pot):", formatPaiseAsINR(data.potAmount));
    labelValue(doc, "Winning discount:", formatPaiseAsINR(data.discountAmount));
    labelValue(doc, "Foreman commission:", formatPaiseAsINR(data.commissionAmount));
    labelValue(doc, "Dividend per member:", formatPaiseAsINR(data.dividendPerMember));
    labelValue(doc, "Prize to winner:", formatPaiseAsINR(data.prizeAmount));
    doc.moveDown(0.6);

    doc.font("Helvetica-Bold").fontSize(12).fillColor(BRASS).text("Prized subscriber (winner)");
    doc.moveDown(0.3);
    labelValue(doc, "Name:", `${data.winner.name}  (${data.winner.memberCode})`);
    labelValue(doc, "Ticket:", `#${data.winner.ticketNumber}`);
    doc.moveDown(0.6);

    if (data.bids.length > 0) {
      doc.font("Helvetica-Bold").fontSize(12).fillColor(BRASS).text("Bids recorded");
      doc.moveDown(0.3);
      doc.font("Helvetica").fontSize(10).fillColor(INK);
      for (const bid of data.bids) {
        doc.text(`Ticket #${bid.ticketNumber}  ·  ${bid.memberName}  ·  discount ${formatPaiseAsINR(bid.discountAmount)}`);
        doc.moveDown(0.15);
      }
      doc.moveDown(0.6);
    }

    doc.font("Helvetica-Oblique").fontSize(9).fillColor(MUTED).text(
      "This document is a system-generated record of the above chit auction. Figures are exact to the paise " +
        "and balance: prize + commission + (dividend × members) = chit value.",
      { align: "left" },
    );
    doc.moveDown(2);
    doc.font("Helvetica").fontSize(10).fillColor(INK).text("Foreman / Authorised signatory: ______________________________");
  });
}

export function generateWinnerVoucherPdf(data: WinnerVoucherData): Promise<Buffer> {
  return renderToBuffer((doc) => {
    heading(doc, data.organizationName, "Prize Money Voucher");

    labelValue(doc, "Chit group:", `${data.chitGroupName}  (Reg. ${data.registrationNumber})`);
    labelValue(doc, "Cycle:", `#${data.cycleNumber}`);
    labelValue(doc, "Date:", fmtDate(data.auctionDate));
    doc.moveDown(0.8);

    doc.font("Helvetica").fontSize(11).fillColor(MUTED).text("Prize amount payable to the prized subscriber", { align: "center" });
    doc.moveDown(0.2);
    doc.font("Helvetica-Bold").fontSize(30).fillColor(BRASS).text(formatPaiseAsINR(data.prizeAmount), { align: "center" });
    doc.moveDown(1);

    doc.font("Helvetica-Bold").fontSize(12).fillColor(BRASS).text("Payable to");
    doc.moveDown(0.3);
    labelValue(doc, "Name:", `${data.winner.name}  (${data.winner.memberCode})`);
    labelValue(doc, "Ticket:", `#${data.winner.ticketNumber}`);
    labelValue(doc, "Phone:", data.winner.phone);
    doc.moveDown(2);

    doc.font("Helvetica").fontSize(10).fillColor(INK).text("Received the above prize money in full.");
    doc.moveDown(1.5);
    doc.text("Subscriber signature: ______________________     Date: ______________");
    doc.moveDown(1);
    doc.text("Foreman / Authorised signatory: ______________________________");
  });
}
