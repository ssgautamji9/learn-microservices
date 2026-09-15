import { RabbitMQClient } from "./rabbitmq";

let rabbitMQ: RabbitMQClient | null = null;

export const initRabbitMQ = async (config: { url: string }) => {
  if (rabbitMQ) return;
  
  rabbitMQ = new RabbitMQClient(config);
  await rabbitMQ.connect(3, 3000);
};

export const getRabbitMQ = (): RabbitMQClient => {
  if (!rabbitMQ) {
    throw new Error("RabbitMQ client is not initialized");
  }
  return rabbitMQ;
};