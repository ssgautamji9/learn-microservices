import { PrismaClient } from "@prisma/client";

// Single shared instance to avoid exhausting Postgres connections in dev (hot reload).
export const prisma = new PrismaClient();
