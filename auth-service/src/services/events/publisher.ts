import { getRabbitMQ } from "@solutionspool/rabbitmq";
import { env } from "../../config/env";

export type TUserCreatedEvent = {
  event: "user.created";
  userId: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
};

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
 * Publishes the 'user.created' event when a new user registers.
 */
export async function publishUserCreated(payload: TUserCreatedEvent): Promise<boolean> {
  return publishEvent("user.created", payload);
}
