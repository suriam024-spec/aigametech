import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth";

const router = Router();

// ชั่วคราว: ไว้ทดสอบ role -> ขั้นที่ 10 จะแทนด้วย /admin/stats และ /admin/games
router.get("/ping", requireAuth, requireAdmin, (req, res) => {
  res.json({ ok: true, admin: req.user!.email });
});

export default router;
