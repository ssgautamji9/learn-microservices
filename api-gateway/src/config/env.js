import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  AUTH_SERVICE_URL: z.string().default("http://auth-service:3000"),
  USER_SERVICE_URL: z.string().default("http://user-service:3000"),
  POST_SERVICE_URL: z.string().default("http://post-service:3000"),
  // How long the gateway waits for an upstream before giving up (504).
  UPSTREAM_TIMEOUT_MS: z.coerce.number().default(5000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast: an invalid/missing env var here means the service cannot run securely.
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;