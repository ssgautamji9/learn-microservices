import { getRabbitMQ } from "@solutionspool/rabbitmq"
import { assertValidEvent, UserCreatedV1 } from "@solutionspool/data-contracts";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";

/**
 * Handle incoming user.created event and create/upsert a user profile in DB.
 */
export async function handleUserCreated(eventData: UserCreatedV1): Promise<void> {
  console.log(`[User Service] Handling user.created event for userId: ${eventData.userId}`);

  // Idempotent upsert: ensure profile exists for the new user
  await prisma.userProfile.upsert({
    where: { userId: eventData.userId },
    update: {},
    create: {
      userId: eventData.userId,
      displayName: eventData.name || "User",
    },
  });

  console.log(`[User Service] User profile successfully initialized for userId: ${eventData.userId}`);
}

/**
 * Start listening for user.created events from RabbitMQ.
 */
export async function startEventConsumer(): Promise<void> {
  await getRabbitMQ().subscribe<unknown>(
    env.RABBITMQ_EXCHANGE,
    "user.created",
    env.RABBITMQ_QUEUE,
    async (rawData) => {
      // TypeScript types vanish at runtime, so validate the actual message against the contract.
      // A violation throws -> the message is nack'd (no requeue): retrying a bad payload can never succeed.
      const eventData = assertValidEvent("user.created", rawData);
      await handleUserCreated(eventData);
    }
  );
}
