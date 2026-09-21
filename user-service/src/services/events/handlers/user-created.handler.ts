import { UserCreatedV1 } from "@solutionspool/data-contracts";
import { prisma } from "../../../config/prisma";

/**
 * Handle incoming user.created event and create/upsert a user profile in DB.
 * Idempotent: replays hit the unique userId and change nothing.
 */
export async function handleUserCreated(event: UserCreatedV1): Promise<void> {
  console.log(`[User Service] Handling user.created event for userId: ${event.userId}`);

  await prisma.userProfile.upsert({
    where: { userId: event.userId },
    update: {},
    create: {
      userId: event.userId,
      displayName: event.name || "User",
    },
  });

  console.log(`[User Service] User profile successfully initialized for userId: ${event.userId}`);
}
