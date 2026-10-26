import { Router } from "express";
import { optionalAuth } from "../middleware/optionalAuth";
import { clear, mine, options, save } from "../controllers/specController";

// router นี้ mount ที่ "/" เพราะมี 2 prefix: /specs และ /me
const router = Router();

router.get("/specs/options", options);
router.get("/me/specs", optionalAuth, mine);
router.put("/me/specs", optionalAuth, save);
router.delete("/me/specs", optionalAuth, clear);

export default router;