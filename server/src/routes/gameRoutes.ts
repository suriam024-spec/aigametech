import { Router } from "express";
import { optionalAuth } from "../middleware/optionalAuth";
import { details, list, trending } from "../controllers/gameController";

const router = Router();

router.get("/trending", optionalAuth, trending); // ต้องอยู่ก่อน /:id
router.get("/", optionalAuth, list);
router.get("/:id", optionalAuth, details);

export default router;