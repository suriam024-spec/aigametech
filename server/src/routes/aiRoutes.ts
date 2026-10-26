import { Router } from "express";
import { optionalAuth } from "../middleware/optionalAuth";
import { aiRateLimit } from "../middleware/aiRateLimit";
import { search } from "../controllers/aiController";
import { upgradeAdvice } from "../controllers/upgradeController";

const router = Router();

router.use(aiRateLimit);
router.post("/search", optionalAuth, search);
router.post("/upgrade-advice", optionalAuth, upgradeAdvice);

export default router;