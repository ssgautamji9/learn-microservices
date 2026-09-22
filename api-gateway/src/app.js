import express from "express";
import { routes } from "./config/routes.js";
import { requestContext } from "./middleware/requestContext.js";
import { routePolicy } from "./middleware/routePolicy.js";
import { createUpstreamProxy } from "./lib/upstreamProxy.js";

const app = express();
app.disable("x-powered-by");

app.use((_req, res, next) => {
  res.setHeader("Server-Tag", "api-gateway");
  next();
});
app.use(requestContext);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "api-gateway" });
});

// Every route is: policy (auth, roles, rate limit) -> proxy. All policy lives in config/routes.js.
for (const route of routes) {
  app.use(route.prefix, routePolicy(route), createUpstreamProxy(route));
}

app.use((req, res) => {
  res.status(404).json({ message: "Route not found", requestId: req.id });
});

app.use((err, req, res, _next) => {
  console.error(`[gateway] Unhandled error requestId=${req.id}:`, err);
  res.status(500).json({ message: "Internal gateway error", requestId: req.id });
});

export default app;
