import { z } from "zod";
import { Role } from "@prisma/client";

// Internal/DB representation — mirrors the Prisma `User` model.
// passwordHash must never appear in a derived DTO below.
const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.nativeEnum(Role),
  passwordHash: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TUserRecord = z.infer<typeof UserSchema>;

// Minimal shape for register/login responses.
export const PublicUserDto = UserSchema.pick({ id: true, email: true, name: true });
export type TPublicUser = z.infer<typeof PublicUserDto>;

// Full profile shape for the authenticated user (GET /auth/me).
export const SelfUserDto = UserSchema.omit({ passwordHash: true });
export type TSelfUser = z.infer<typeof SelfUserDto>;

export function toPublicUser(user: TUserRecord): TPublicUser {
  return PublicUserDto.parse(user);
}

export function toSelfUser(user: TUserRecord): TSelfUser {
  return SelfUserDto.parse(user);
}
