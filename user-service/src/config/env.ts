import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  RABBITMQ_URL: z.string().default("amqp://guest:guest@localhost:5672"),
  RABBITMQ_EXCHANGE: z.string().default("auth_events"),
  RABBITMQ_QUEUE: z.string().default("user_service_user_created"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
