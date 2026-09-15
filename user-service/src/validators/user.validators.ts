import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z.string().min(1, "Display name cannot be empty").optional(),
  profileImage: z.string().url("Invalid image URL").nullable().optional(),
  mobileNumber: z.string().min(5, "Invalid mobile number").nullable().optional(),
  gender: z.string().nullable().optional(),
  bio: z.string().max(500, "Bio cannot exceed 500 characters").nullable().optional(),
});

export type TUpdateProfileInput = z.infer<typeof updateProfileSchema>;
