import { getRabbitMQ } from "@solutionspool/rabbitmq";
import { assertValidEvent, EventMap } from "@solutionspool/data-contracts";
import { EXCHANGES } from "./topology";

/**
 * Every event this service publishes -> the exchange it goes to.
 * Convention: one topic exchange per service, events told apart by routing key.
 * Add a second exchange only for a concrete reason (different routing type, permissions or DLQ policy).
 * Never publish into an exchange owned by another service.
 */
const PUBLISHED_EVENTS = {
  "post.created": EXCHANGES.POST_EVENTS,
} as const;

export type PublishedEvent = keyof typeof PUBLISHED_EVENTS;

/**
 * Validates the payload against its JSON Schema contract, then publishes it to the
 * exchange registered for that event, using the event name as the routing key.
 */
export async function publishEvent<K extends PublishedEvent>(
  event: K,
  payload: EventMap[K],
): Promise<boolean> {
  const validated = assertValidEvent(event, payload);
  return getRabbitMQ().publish(PUBLISHED_EVENTS[event], event, validated);
}
