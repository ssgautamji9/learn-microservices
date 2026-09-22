import app from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.PORT, () => {
  console.log(`API Gateway is running on port ${env.PORT}`);
});

const shutdown = () => {
  console.log("API Gateway is stopping...");
  server.close(() => {
    console.log("API Gateway has been stopped");
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);

process.on("SIGTERM", shutdown);
