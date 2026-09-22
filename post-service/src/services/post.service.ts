import { randomUUID } from "node:crypto";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/httpError";
import { TCreatePostInput } from "../validators/post.validators";
import { publishEvent } from "./events/publisher";

export async function createPost(authorId: string, input: TCreatePostInput) {
  const post = await prisma.post.create({
    data: { authorId, ...input },
  });

  // The post is already saved, so a publish failure must not fail the request.
  // Known gap (dual write): the DB write and the publish are not atomic, so a failure here
  // leaves other services' copies of the data (e.g. postsCount) stale. The outbox pattern fixes this.
  try {
    await publishEvent("post.created", {
      eventId: randomUUID(),
      event: "post.created",
      postId: post.id,
      authorId: post.authorId,
      createdAt: post.createdAt.toISOString(),
    });
  } catch (error) {
    console.error(`[Post Service] Failed to publish post.created for post ${post.id}:`, (error as Error).message);
  }

  return post;
}

export async function getPostById(postId: string) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    throw new AppError(404, "Post not found");
  }
  return post;
}

export async function listPostsByAuthor(authorId: string) {
  return prisma.post.findMany({ where: { authorId }, orderBy: { createdAt: "desc" } });
}
