import { Router } from "express";
import { askInteractionHandler, submitInteractionHandler } from "../controllers/interactionController.mjs";

export const interactionRouter = Router();

interactionRouter.post("/ask", askInteractionHandler);
interactionRouter.post("/submit", submitInteractionHandler);
