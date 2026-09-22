import { Router } from "express";
import { createPostHandler, getPostHandler, listMyPostsHandler } from "../controllers/post.controller";
import { requireUser } from "../middleware/requireUser";
import { validate } from "../middleware/validate";
import { createPostSchema } from "../validators/post.validators";

const router = Router();
router.post("/", requireUser, validate(createPostSchema), createPostHandler);
router.get("/me", requireUser, listMyPostsHandler);
router.get("/:postId", getPostHandler);

export default router;
