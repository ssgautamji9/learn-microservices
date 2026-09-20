import { getRabbitMQ } from "@solutionspool/rabbitmq";
import { assertValidEvent, UserCreatedV1, UserUpdatedV1  } from "@solutionspool/data-contracts";
import { env } from "../../config/env";

/**
 * Generic, reusable event publisher.
 * Publishes any domain event payload to a RabbitMQ exchange with the given routing key.
 */
export async function publishEvent<T>(
  routingKey: string,
  payload: T,
  exchangeName: string = env.RABBITMQ_EXCHANGE,
  exchangeType: "topic" | "direct" | "fanout" = "topic"
): Promise<boolean> {
  const rabbitmq = getRabbitMQ();
  return rabbitmq.publish(exchangeName, routingKey, payload, {}, exchangeType);
}

/**
 * Publishes the 'user.updated' event when a user's profile is updated.
 * The payload is validated against the shared JSON Schema contract before it leaves this service.
 */
export async function publishUserUpdated(payload: UserUpdatedV1): Promise<boolean> {
  const event = assertValidEvent("user.updated", payload);
  return publishEvent("user.updated", event);
}
