import { Router } from "express";
import {
  getMyProfileHandler,
  getPublicProfileHandler,
  updateMyProfileHandler,
  getAllUsersHandler,
} from "../controllers/user.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate";
import { updateProfileSchema } from "../validators/user.validators";

const router = Router();
router.get("/", getAllUsersHandler);
router.get("/me", getMyProfileHandler);
router.patch("/me", requireAuth, validate(updateProfileSchema), updateMyProfileHandler);
router.get("/:userId", getPublicProfileHandler);

export default router;
