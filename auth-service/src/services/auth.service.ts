import { prisma } from "../config/prisma";
import { AppError } from "../utils/httpError";
import { hashPassword, comparePassword } from "../utils/password";
import { signAccessToken } from "../utils/jwt";
import { TRegisterInput, TLoginInput } from "../validators/auth.validators";
import { publishUserCreated } from "./events/publisher";
import { toPublicUser, toSelfUser } from "../dtos/user.dto";
import { Role } from "@prisma/client";

export async function registerUser(input: TRegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError(409, "Email is already registered");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { email: input.email, passwordHash, name: input.name, role: input.role as Role },
  });

  await publishUserCreated({
    event: "user.created",
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  });

  return toPublicUser(user);
}

export async function loginUser(input: TLoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Compare against a fixed hash when the user doesn't exist to keep response timing consistent.
  const passwordHash = user?.passwordHash ?? "$2b$12$invalidsaltinvalidsaltinvalidsaltinvalidsaltinva";
  const isPasswordValid = await comparePassword(input.password, passwordHash);

  if (!user || !isPasswordValid) {
    throw new AppError(401, "Invalid email or password");
  }

  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });

  return { accessToken, user: toSelfUser(user) };
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, "User not found");
  }
  return toSelfUser(user);
}
