import multer from "multer";

import { AppError } from "../../utils/app-error.js";

const MAX_CSV_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — comfortably fits tens of thousands of rows
const ALLOWED_CSV_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel", // some browsers/OSes label .csv this way
  "text/plain",
]);

/** Single-CSV upload middleware for bulk member import — memory storage, buffer parsed in the service. */
export const uploadMemberCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_CSV_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    const isCsvByName = file.originalname.toLowerCase().endsWith(".csv");
    if (!ALLOWED_CSV_MIME_TYPES.has(file.mimetype) && !isCsvByName) {
      callback(AppError.badRequest(`Expected a .csv file, received: ${file.mimetype}`));
      return;
    }
    callback(null, true);
  },
}).single("file");
