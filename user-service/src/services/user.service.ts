import { prisma } from "../config/prisma";
import { AppError } from "../utils/httpError";
import { toUserProfileResponse, TUserProfile } from "../dtos/userProfile.dto";
import { TUpdateProfileInput } from "../validators/user.validators";

export async function getProfileByUserId(userId: string): Promise<TUserProfile> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new AppError(404, "User profile not found");
  }

  return toUserProfileResponse(profile);
}

export async function updateProfileByUserId(
  userId: string,
  input: TUpdateProfileInput
): Promise<TUserProfile> {
  let profile = await prisma.userProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    // If profile was not initialized yet, create it on demand
    profile = await prisma.userProfile.create({
      data: {
        userId,
        displayName: input.displayName || "User",
        ...input,
      },
    });
  } else {
    profile = await prisma.userProfile.update({
      where: { userId },
      data: input,
    });
  }

  return toUserProfileResponse(profile);
}

export async function getAllUsers(): Promise<TUserProfile[]> {
  const users = await prisma.userProfile.findMany();
  return users.map(toUserProfileResponse);
}
