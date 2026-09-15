import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast: an invalid/missing env var here means the service cannot run securely.
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;