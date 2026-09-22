import { Request, Response, NextFunction } from "express";

/**
 * Trusts the identity forwarded by the API Gateway (which verified the JWT and overwrote
 * any client-supplied value). Post Service is only reachable through the gateway in production.
 */
export function requireUser(req: Request, res: Response, next: NextFunction) {
  const userId = req.header("x-user-id");
  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  req.userId = userId;
  next();
}
