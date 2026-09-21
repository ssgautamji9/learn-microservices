/**
 * RabbitMQ topology owned/used by Auth Service.
 *
 * Rule of thumb: an exchange belongs to the service that PUBLISHES to it,
 * a queue belongs to the service that CONSUMES from it.
 * These names are part of the messaging contract, so they live in code, not in .env.
 */
export const EXCHANGES = {
  /** Published by Auth Service (user.created). */
  AUTH_EVENTS: "auth_events",
  /** Published by User Service (user.updated). Auth only consumes from it. */
  USER_EVENTS: "user_events",
} as const;

export const QUEUES = {
  /** Auth Service's own queue, bound to USER_EVENTS with routing key `user.updated`. */
  USER_UPDATED: "auth_service_user_updated",
} as const;
