import { UserUpdatedV1 } from "@solutionspool/data-contracts";
import { prisma } from "../../../config/prisma";

/**
 * Handle incoming user.updated event by syncing the identity's display name.
 * Idempotent: replaying the same event just rewrites the same value.
 * Uses updateMany so an unknown userId is a no-op instead of a thrown error.
 */
export async function handleUserUpdated(event: UserUpdatedV1): Promise<void> {
  console.log(`[Auth Service] Handling user.updated event for userId: ${event.userId}`);

  const { count } = await prisma.user.updateMany({
    where: { id: event.userId },
    data: { name: event.displayName },
  });

  if (count === 0) {
    console.warn(`[Auth Service] user.updated ignored, unknown userId: ${event.userId}`);
  }
}
