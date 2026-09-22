import { PostCreatedV1 } from "@solutionspool/data-contracts";
import { prisma } from "../../../config/prisma";

/**
 * Handle post.created by incrementing the author's postsCount.
 *
 * `postsCount + 1` is NOT idempotent, and RabbitMQ delivers at-least-once, so a redelivered
 * message would double count. The inbox row and the increment commit in ONE transaction:
 * either both happen or neither does.
 */
export async function handlePostCreated(event: PostCreatedV1): Promise<void> {
  console.log(`[User Service] Handling post.created event ${event.eventId} for authorId: ${event.authorId}`);

  await prisma.$transaction(async (tx) => {
    // createMany + skipDuplicates = INSERT ... ON CONFLICT DO NOTHING; count 0 means "seen before".
    // (A plain create would throw on conflict and poison the whole Postgres transaction.)
    const { count: inserted } = await tx.processedEvent.createMany({
      data: [{ eventId: event.eventId }],
      skipDuplicates: true,
    });

    if (inserted === 0) {
      console.log(`[User Service] Duplicate event ${event.eventId} ignored`);
      return;
    }

    const { count: updated } = await tx.userProfile.updateMany({
      where: { userId: event.authorId },
      data: { postsCount: { increment: 1 } },
    });

    // Throwing rolls back the inbox insert too, so the event is not wrongly recorded as processed.
    if (updated === 0) {
      throw new Error(`No profile for authorId ${event.authorId} yet (event ${event.eventId})`);
    }
  });
}
