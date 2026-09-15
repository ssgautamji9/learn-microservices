import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
