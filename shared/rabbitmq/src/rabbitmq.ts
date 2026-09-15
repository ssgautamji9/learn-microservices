import amqp, { Channel, ChannelModel, ConsumeMessage } from "amqplib";

export class RabbitMQClient {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private assertedExchanges = new Set<string>();
  private isConnecting = false;
  
  private url: string;

  constructor(config: { url: string }) {
    this.url = config.url;
  }

  /**
   * Connect to RabbitMQ with retry logic on startup.
   */
  async connect(retries = 5, delayMs = 3000): Promise<Channel> {
    if (this.channel) return this.channel;
    if (this.isConnecting) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (this.channel) return this.channel;
    }

    this.isConnecting = true;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(
          `Connecting to RabbitMQ at ${this.url} (attempt ${attempt}/${retries})...`,
        );
        this.connection = await amqp.connect(this.url);

        this.connection.on("error", (err) => {
          console.error("RabbitMQ connection error:", err.message);
          this.reset();
        });

        this.connection.on("close", () => {
          console.warn("RabbitMQ connection closed.");
          this.reset();
        });

        this.channel = await this.connection.createChannel();
        this.channel.on("error", (err) => {
          console.error("RabbitMQ channel error:", err.message);
        });

        console.log("Successfully connected to RabbitMQ");
        this.isConnecting = false;
        return this.channel;
      } catch (error) {
        console.error(
          `Failed to connect to RabbitMQ (attempt ${attempt}/${retries}):`,
          (error as Error).message,
        );
        if (attempt === retries) {
          this.isConnecting = false;
          throw new Error(
            `Could not establish RabbitMQ connection after ${retries} attempts.`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    this.isConnecting = false;
    throw new Error("Could not connect to RabbitMQ");
  }

  private reset() {
    this.connection = null;
    this.channel = null;
    this.assertedExchanges.clear();
  }

  /**
   * Assert an exchange on the active channel.
   */
  async assertExchange(
    exchangeName: string,
    exchangeType: "topic" | "direct" | "fanout" | "headers" = "topic",
  ): Promise<void> {
    const channel = await this.connect();
    const key = `${exchangeName}:${exchangeType}`;

    if (!this.assertedExchanges.has(key)) {
      await channel.assertExchange(exchangeName, exchangeType, {
        durable: true,
      });
      this.assertedExchanges.add(key);
    }
  }

  /**
   * Subscribe to messages from an exchange with a specific routing key and queue.
   */
  async subscribe<T>(
    exchangeName: string,
    routingKey: string,
    queueName: string,
    onMessage: (data: T, rawMsg: ConsumeMessage) => Promise<void>,
    exchangeType: "topic" | "direct" | "fanout" = "topic",
  ): Promise<void> {
    await this.assertExchange(exchangeName, exchangeType);
    const channel = await this.connect();

    await channel.assertQueue(queueName, { durable: true });
    await channel.bindQueue(queueName, exchangeName, routingKey);

    // Fair dispatch
    await channel.prefetch(1);

    console.log(
      `[RabbitMQ] Subscribed queue '${queueName}' to exchange '${exchangeName}' with key '${routingKey}'`,
    );

    await channel.consume(
      queueName,
      async (msg) => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString()) as T;
          await onMessage(content, msg);
          channel.ack(msg);
        } catch (error) {
          console.error(
            `[RabbitMQ] Error processing message from '${queueName}':`,
            (error as Error).message,
          );
          // Nack message without requeue if malformed, or requeue if temporary error
          channel.nack(msg, false, false);
        }
      },
      { noAck: false },
    );
  }

  /**
   * Publish a message to a RabbitMQ exchange with a specific routing key.
   */
  async publish<T>(
    exchangeName: string,
    routingKey: string,
    payload: T,
    options: amqp.Options.Publish = {},
    exchangeType: "topic" | "direct" | "fanout" | "headers" = "topic",
  ): Promise<boolean> {
    try {
      await this.assertExchange(exchangeName, exchangeType);
      const channel = await this.connect();

      const buffer = Buffer.from(JSON.stringify(payload));
      const publishOptions: amqp.Options.Publish = {
        contentType: "application/json",
        timestamp: Date.now(),
        persistent: true,
        ...options,
      };

      const published = channel.publish(
        exchangeName,
        routingKey,
        buffer,
        publishOptions,
      );
      if (published) {
        console.log(
          `[RabbitMQ] Published event '${routingKey}' to exchange '${exchangeName}'`,
        );
      } else {
        console.warn(
          `[RabbitMQ] Publish buffer full for event '${routingKey}'`,
        );
      }
      return published;
    } catch (error) {
      console.error(
        `[RabbitMQ] Failed to publish event '${routingKey}':`,
        (error as Error).message,
      );
      throw error;
    }
  }

  /**
   * Gracefully close channel and connection.
   */
  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      console.log("RabbitMQ connection closed cleanly.");
    } catch (error) {
      console.error(
        "Error closing RabbitMQ connection:",
        (error as Error).message,
      );
    } finally {
      this.reset();
    }
  }
}
