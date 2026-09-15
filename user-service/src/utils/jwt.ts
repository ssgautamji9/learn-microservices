import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { JwtPayload } from "../types/jwt";

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
