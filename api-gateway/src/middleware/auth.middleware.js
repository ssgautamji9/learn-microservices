import { env } from "../config/env.js";
import jwt from "jsonwebtoken";

export function authenticate(req, res, next) {
  const authorization = req.headers["authorization"];

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const token = authorization.split(" ")[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = { id: decoded.sub, role: decoded.role };
    // Trusted identity for downstream services. requestContext already removed any client-sent values.
    req.headers["x-user-id"] = decoded.sub;
    req.headers["x-user-role"] = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token or expired token" });
  }
}

export function authorize(roles = []) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
