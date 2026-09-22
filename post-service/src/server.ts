import app from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { initRabbitMQ, getRabbitMQ } from "@solutionspool/rabbitmq";
import { EXCHANGES } from "./services/events/topology";

async function main() {
  try {
    await initRabbitMQ({ url: env.RABBITMQ_URL });
    await getRabbitMQ().assertExchange(EXCHANGES.POST_EVENTS, "topic");
  } catch (error) {
    console.error("RabbitMQ initialization error during startup:", (error as Error).message);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`post-service listening on http://localhost:${env.PORT}`);
  });

  async function shutdown() {
    console.log("Shutting down post-service...");
    await getRabbitMQ().close();
    await prisma.$disconnect();
    server.close(() => process.exit(0));
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Unhandled error starting post-service:", err);
  process.exit(1);
});
