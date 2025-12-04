import { Router } from "express";
import { startSessionHandler, endSessionHandler } from "../controllers/sessionController.mjs";

export const sessionRouter = Router();

sessionRouter.post("/start", startSessionHandler);
sessionRouter.post("/end", endSessionHandler);
