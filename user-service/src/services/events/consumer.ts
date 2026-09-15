import { getRabbitMQ } from "@solutionspool/rabbitmq"
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";

export type TUserCreatedEvent = {
  event: "user.created";
  userId: string;
  email: string;
  name: string;
  createdAt: string;
};

/**
 * Handle incoming user.created event and create/upsert a user profile in DB.
 */
export async function handleUserCreated(eventData: TUserCreatedEvent): Promise<void> {
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
  await getRabbitMQ().subscribe<TUserCreatedEvent>(
    env.RABBITMQ_EXCHANGE,
    "user.created",
    env.RABBITMQ_QUEUE,
    async (eventData) => {
      await handleUserCreated(eventData);
    }
  );
}
