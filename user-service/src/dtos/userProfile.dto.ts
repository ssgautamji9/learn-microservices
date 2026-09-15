import { UserProfile } from "@prisma/client";
import { z } from "zod";

const UserProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  displayName: z.string(),
  profileImage: z.string().nullable(),
  mobileNumber: z.string().nullable(),
  gender: z.string().nullable(),
  bio: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const PublicProfileSchema = UserProfileSchema.pick({ 
  id: true,
  userId: true,
  displayName: true,
  profileImage: true,
  bio: true,
  createdAt: true,
  updatedAt: true,
});

export type TUserProfile = z.infer<typeof UserProfileSchema>;
export type TPublicProfile = z.infer<typeof PublicProfileSchema>;

export function toUserProfileResponse(profile: UserProfile): TUserProfile {
  return UserProfileSchema.parse(profile);
}

export function toPublicProfileResponse(profile: UserProfile): TPublicProfile {
  return PublicProfileSchema.parse(profile);
}
