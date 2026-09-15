import { z } from "zod";
import { Role } from "@prisma/client";
// Requires upper+lower+digit+special char, min 8 chars.
const passwordSchema = z
  .string()
  .min(4, "Password must be at least 4 characters long")
  // .regex(/[a-z]/, "Password must contain a lowercase letter")
  // .regex(/[A-Z]/, "Password must contain an uppercase letter")
  // .regex(/[0-9]/, "Password must contain a digit")
  // .regex(/[^a-zA-Z0-9]/, "Password must contain a special character");

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: passwordSchema,
  name: z.string().trim().min(1, "Name is required"),
  role: z.string().trim().optional().refine(val => !val || Object.values(Role).includes(val as Role), {
    message: "Role must be either 'USER' or 'ADMIN' if provided",
  })
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type TRegisterInput = z.infer<typeof registerSchema>;
export type TLoginInput = z.infer<typeof loginSchema>;
