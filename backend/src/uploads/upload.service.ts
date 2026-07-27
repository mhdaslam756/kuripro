import { cloudinary, isCloudinaryConfigured } from "../config/cloudinary.js";
import { AppError } from "../utils/app-error.js";

export interface UploadResult {
  url: string;
  publicId: string;
  bytes: number;
  format: string;
}

export async function uploadBuffer(buffer: Buffer, options: { folder: string }): Promise<UploadResult> {
  if (!isCloudinaryConfigured) {
    throw AppError.internal("File uploads are not configured on this server");
  }

  return new Promise<UploadResult>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: options.folder, resource_type: "auto" },
      (error, result) => {
        if (error || !result) {
          reject(error instanceof Error ? error : new Error("Cloudinary upload failed with no result"));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id, bytes: result.bytes, format: result.format });
      },
    );
    uploadStream.end(buffer);
  });
}
