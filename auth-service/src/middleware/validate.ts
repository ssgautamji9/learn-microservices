import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";
import { AppBadRequestError } from "../utils/httpError";

export function validateBody(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const errors = result.error.errors.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return next(new AppBadRequestError(400, "Validation failed", errors));
    }
    req.body = result.data;
    next();
  };
}
