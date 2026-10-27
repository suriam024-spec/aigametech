import { Router } from "express";
import { create, remove, stats, update } from "../controllers/adminController";
import { requireAdmin, requireAuth } from "../middleware/auth";

const router = Router();

// ทุก route ใน /admin ต้องเป็น admin เท่านั้น
router.use(requireAuth, requireAdmin);

router.get("/stats", stats);
router.post("/games", create);
router.put("/games/:id", update);
router.delete("/games/:id", remove);

export default router;