import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { TJwtPayload } from "../types/jwt";

export function signAccessToken(payload: Pick<TJwtPayload, "sub" | "email" | "role">): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as SignOptions);
}

export function verifyAccessToken(token: string): TJwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as TJwtPayload;
}

const UNIT_SECONDS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };

// Mirrors the subset of the jsonwebtoken "expiresIn" format we accept (e.g. "15m", "3600").
export function expiresInSeconds(expiresIn: string): number {
  const match = /^(\d+)([smhd])?$/.exec(expiresIn.trim());
  if (!match) return 0;
  const value = Number(match[1]);
  const unit = match[2] ?? "s";
  return value * UNIT_SECONDS[unit];
}
