import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  RABBITMQ_URL: z.string().default("amqp://guest:guest@localhost:5672"),
  RABBITMQ_EXCHANGE: z.string().default("auth_events"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast: an invalid/missing env var here means the service cannot run securely.
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
