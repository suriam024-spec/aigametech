import { Router } from "express";
import { optionalAuth } from "../middleware/optionalAuth";
import { add, list, remove } from "../controllers/favoriteController";

const router = Router();
router.use(optionalAuth);

router.get("/", list);
router.post("/:gameId", add);
router.delete("/:gameId", remove);

export default router;