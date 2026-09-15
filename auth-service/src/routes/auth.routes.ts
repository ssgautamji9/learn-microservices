import { Router } from "express";
import { register, login, me } from "../controllers/auth.controller";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/auth.middleware";
import { registerSchema, loginSchema } from "../validators/auth.validators";

const router = Router();

router.post("/register", validateBody(registerSchema), register);
router.post("/login", validateBody(loginSchema), login);
router.get("/me", requireAuth, me);

export default router;
