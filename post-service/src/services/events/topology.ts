/**
 * RabbitMQ topology used by Post Service.
 * An exchange belongs to the service that PUBLISHES to it. Post Service consumes nothing yet.
 */
export const EXCHANGES = {
  /** Published by Post Service (post.created). */
  POST_EVENTS: "post_events",
} as const;
