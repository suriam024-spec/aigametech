import { Router } from "express";
import { optionalAuth } from "../middleware/optionalAuth";
import { recommendations } from "../controllers/recommendationController";

const router = Router();

router.get("/", optionalAuth, recommendations);

export default router;