import { Router } from "express";

import { requireAuth } from "../middleware/jwt-auth.js";
import * as uploadController from "./upload.controller.js";
import { uploadSingleFile } from "./upload.middleware.js";

export const uploadsRouter: Router = Router();

uploadsRouter.post("/", requireAuth, uploadSingleFile, uploadController.uploadFile);
