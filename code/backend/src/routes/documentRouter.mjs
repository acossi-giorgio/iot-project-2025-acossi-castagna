import { Router } from "express";
import multer from "multer";
import { uploadDocumentHandler } from "../controllers/documentController.mjs";

export const documentRouter = Router();

const upload = multer({ storage: multer.memoryStorage() });

documentRouter.post("/upload", upload.single("file"), uploadDocumentHandler);
