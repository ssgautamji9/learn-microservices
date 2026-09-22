import { z } from "zod";

export const createPostSchema = z.object({
  title: z.string().trim().min(1, "Title cannot be empty").max(200),
  subTitle: z.string().trim().max(300).nullable().optional(),
  images: z.array(z.string().url("Invalid image URL")).max(10).default([]),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
});

export type TCreatePostInput = z.infer<typeof createPostSchema>;
