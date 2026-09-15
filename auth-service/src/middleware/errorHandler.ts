import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { AppBadRequestError, AppError } from "../utils/httpError";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ message: `${_req.method} ${_req.originalUrl} : Route not found` });
}

// Kept last in the middleware chain; must not leak stack traces or internal details.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {

  if (err instanceof AppBadRequestError) {
    return res.status(err.statusCode).json({ message: err.message, errors: err.errors });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return res.status(409).json({ message: "Resource already exists" });
  }

  console.error(err);
  return res.status(500).json({ message: "Internal server error" });
}
