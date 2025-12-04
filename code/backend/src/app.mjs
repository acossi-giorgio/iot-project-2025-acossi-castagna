import express from "express";
import { interactionRouter } from "./routes/interactionRouter.mjs";
import { sessionRouter } from "./routes/sessionRouter.mjs";
import { documentRouter } from "./routes/documentRouter.mjs";
import { authMiddleware } from "./middleware/authMiddleware.mjs";


export function createApp() {
    const app = express();
    app.use(express.json({ limit: "2mb" }));

    app.get("/health", (_req, res) => res.json({ status: "ok" }));
  
    app.use(authMiddleware);

    app.use("/document", documentRouter)
    app.use("/interaction", interactionRouter);
    app.use("/session", sessionRouter)
    
  return app;
}
