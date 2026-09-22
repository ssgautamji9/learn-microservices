/**
 * RabbitMQ topology owned/used by User Service.
 *
 * Rule of thumb: an exchange belongs to the service that PUBLISHES to it,
 * a queue belongs to the service that CONSUMES from it.
 * These names are part of the messaging contract, so they live in code, not in .env.
 */
export const EXCHANGES = {
  /** Published by Auth Service (user.created). User Service only consumes from it. */
  AUTH_EVENTS: "auth_events",
  /** Published by User Service (user.updated). */
  USER_EVENTS: "user_events",
  /** Published by Post Service (post.created). User Service only consumes from it. */
  POST_EVENTS: "post_events",
} as const;

export const QUEUES = {
  /** User Service's own queue, bound to AUTH_EVENTS with routing key `user.created`. */
  USER_CREATED: "user_service_user_created",
  /** Bound to POST_EVENTS with routing key `post.created`. */
  POST_CREATED: "user_service_post_created",
} as const;
