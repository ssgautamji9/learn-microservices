import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/httpError";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ message: `${_req.method} ${_req.originalUrl} : Route not found` });
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
}
