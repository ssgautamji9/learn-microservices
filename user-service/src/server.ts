import app from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { initRabbitMQ, getRabbitMQ } from "@solutionspool/rabbitmq"
import { startEventConsumer } from "./services/events/consumer";

async function main() {
  try {
    await initRabbitMQ({ url: env.RABBITMQ_URL });
    await startEventConsumer();
  } catch (error) {
    console.error("RabbitMQ event consumer initialization error during startup:", (error as Error).message);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`user-service listening on http://localhost:${env.PORT}`);
  });

  async function shutdown() {
    console.log("Shutting down user-service...");
    await getRabbitMQ().close();
    await prisma.$disconnect();
    server.close(() => process.exit(0));
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Unhandled error starting user-service:", err);
  process.exit(1);
});
