import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { authenticate, authorize } from "./middleware/auth.middleware.js";
import {
  LoginRateLimiter,
  SignupRateLimiter,
  DefaultRateLimiter,
} from "./middleware/rateLimiter.js";
import { env } from "./config/env.js";
const app = express();
const secureUserPaths = new Set(["/", "/me"]);
app.use((_req, res, next) => {
  res.setHeader("Server-Tag", "api-gateway");
  next();
});

app.use(
  "/auth",
  (req, res, next) => {
    if (req.path === "/login") {
      return LoginRateLimiter(req, res, next);
    }
    if (req.path === "/register") {
      return SignupRateLimiter(req, res, next);
    }
    return DefaultRateLimiter(req, res, next);
  },
  createProxyMiddleware({
    target: "http://auth-service:3000",
    changeOrigin: true,
    pathRewrite: {
      "^/auth": "",
    },
  }),
);

app.use(
  "/users",
  (req, res, next) => {
    if (secureUserPaths.has(req.path)) {
      if (req.path == "/") {
        return authenticate(req, res, () => {
          authorize(["ADMIN"])(req, res, next);
        });
      }
      if (req.path == "/me") {
        return authenticate(req, res, next);
      }

    }
    next();
  },
  DefaultRateLimiter,
  createProxyMiddleware({
    target: "http://user-service:3000",
    changeOrigin: true,
    pathRewrite: {
      "^/users": "",
    },
  }),
);

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
