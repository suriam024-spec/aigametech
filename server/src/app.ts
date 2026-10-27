import cors from "cors";
import express from "express";
import { config } from "./config";
import { errorHandler } from "./middleware/errorHandler";
import adminRoutes from "./routes/adminRoutes";
import authRoutes from "./routes/authRoutes";
import gameRoutes from "./routes/gameRoutes";
import favoriteRoutes from "./routes/favoriteRoutes";
import recommendationRoutes from "./routes/recommendationRoutes";
import specRoutes from "./routes/specRoutes";
import aiRoutes from "./routes/aiRoutes";


export function createApp() {
  const app = express();
  if (process.env.TRUST_PROXY) app.set("trust proxy", 1);

  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/auth", authRoutes);
  app.use("/admin", adminRoutes);
  app.use("/games", gameRoutes);
  app.use("/favorites", favoriteRoutes);
  app.use("/recommendations", recommendationRoutes);
  app.use("/", specRoutes);
  app.use("/ai", aiRoutes);

  app.use((_req, res) => res.status(404).json({ error: "ไม่พบ endpoint นี้" }));
  app.use(errorHandler);

  return app;
}
