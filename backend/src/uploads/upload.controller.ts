import type { Request, Response } from "express";

import { AppError } from "../utils/app-error.js";
import { uploadBuffer } from "./upload.service.js";

export async function uploadFile(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw AppError.badRequest("No file provided — send it as multipart/form-data under the 'file' field");
  }
  if (!req.auth) {
    throw AppError.unauthorized();
  }

  const folder = `kuripro/${req.auth.tenantId ?? "platform"}`;
  const result = await uploadBuffer(req.file.buffer, { folder });

  res.status(201).json({ url: result.url, publicId: result.publicId, bytes: result.bytes, format: result.format });
}
