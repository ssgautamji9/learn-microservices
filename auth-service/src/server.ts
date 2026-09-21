import app from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { getRabbitMQ, initRabbitMQ } from "@solutionspool/rabbitmq";
import { EXCHANGES } from "./services/events/topology";
import { startEventConsumer } from "./services/events/consumer";

async function main() {
  try {
    await initRabbitMQ({ url: env.RABBITMQ_URL });
    const rabbitmq = getRabbitMQ();
    await rabbitmq.assertExchange(EXCHANGES.AUTH_EVENTS, "topic");
    await startEventConsumer();
  } catch (error) {
    console.error("RabbitMQ initialization error during startup:", (error as Error).message);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`auth-service listening on http://localhost:${env.PORT}`);
  });

  async function shutdown() {
    console.log("Shutting down auth-service...");
    await getRabbitMQ().close();
    await prisma.$disconnect();
    server.close(() => process.exit(0));
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Unhandled error starting auth-service:", err);
  process.exit(1);
});
