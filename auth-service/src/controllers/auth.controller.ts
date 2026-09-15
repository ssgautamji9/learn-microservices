import { Request, Response } from "express";
import { registerUser, loginUser, getUserById } from "../services/auth.service";
import { expiresInSeconds } from "../utils/jwt";
import { env } from "../config/env";

export async function register(req: Request, res: Response) {
  const user = await registerUser(req.body);
  res.status(201).json({ user });
}

export async function login(req: Request, res: Response) {
  const { accessToken, user } = await loginUser(req.body);
  res.status(200).json({
    accessToken,
    tokenType: "Bearer",
    expiresIn: expiresInSeconds(env.JWT_EXPIRES_IN),
    user,
  });
}

export async function me(req: Request, res: Response) {
  const user = await getUserById(req.user!.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json({ message: "User retrieved successfully", user });
}
