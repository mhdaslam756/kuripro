import { Schema, Types } from "mongoose";

/**
 * A generic uploaded-file reference embedded on a parent document (chit-group documents, etc.).
 * The file itself lives in Cloudinary via the shared /uploads endpoint; this just records the
 * pointer plus who attached it and when. Subdocuments keep their own `_id` so a single attachment
 * can be removed by id.
 */
export interface AttachmentEntry {
  _id?: Types.ObjectId;
  label: string;
  url: string;
  publicId: string;
  uploadedAt: Date;
  uploadedBy: Types.ObjectId;
}

export const attachmentSchema = new Schema<AttachmentEntry>(
  {
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    uploadedAt: { type: Date, required: true, default: () => new Date() },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: true },
);
