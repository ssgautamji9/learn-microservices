import { getRabbitMQ } from "@solutionspool/rabbitmq";
import { assertValidEvent, EventMap, EventName } from "@solutionspool/data-contracts";
import { EXCHANGES, QUEUES } from "./topology";
import { handleUserCreated } from "./handlers/user-created.handler";

interface Subscription<K extends EventName> {
  /** Exchange owned by the publishing service. */
  exchange: string;
  /** Contract name; doubles as the routing key. */
  event: K;
  /** This service's own queue for this concern. */
  queue: string;
  /** Receives an already-validated, correctly typed payload. */
  handler: (event: EventMap[K]) => Promise<void>;
}

/**
 * Turns a typed Subscription into a "start" function.
 * Contract validation lives here once, so handlers never touch raw messages.
 * A violation throws -> the message is nack'd (no requeue): retrying a bad payload can never succeed.
 * Returning a plain function erases K, so subscriptions for different events fit in one array.
 */
function subscription<K extends EventName>(s: Subscription<K>): () => Promise<void> {
  return () =>
    getRabbitMQ().subscribe<unknown>(s.exchange, s.event, s.queue, async (raw) => {
      await s.handler(assertValidEvent(s.event, raw));
    });
}

/**
 * Everything User Service listens to. To consume a new event:
 * add its contract to @solutionspool/data-contracts, a queue to topology.ts,
 * a handler in ./handlers, and one entry here.
 */
const subscriptions = [
  subscription({
    exchange: EXCHANGES.AUTH_EVENTS,
    event: "user.created",
    queue: QUEUES.USER_CREATED,
    handler: handleUserCreated,
  }),
];

export async function startEventConsumer(): Promise<void> {
  for (const start of subscriptions) {
    await start();
  }
}
