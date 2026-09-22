import { Request, Response, NextFunction } from "express";
import * as postService from "../services/post.service";

export async function createPostHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const post = await postService.createPost(req.userId!, req.body);
    res.status(201).json(post);
  } catch (error) {
    next(error);
  }
}

export async function getPostHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { postId } = req.params;
    res.json(await postService.getPostById(Array.isArray(postId) ? postId[0] : postId));
  } catch (error) {
    next(error);
  }
}

export async function listMyPostsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await postService.listPostsByAuthor(req.userId!));
  } catch (error) {
    next(error);
  }
}
