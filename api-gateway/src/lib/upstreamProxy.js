import { createProxyMiddleware } from "http-proxy-middleware";
import { env } from "../config/env.js";

const UNREACHABLE = new Set(["ECONNREFUSED", "ENOTFOUND", "EHOSTUNREACH", "EAI_AGAIN"]);

function sendJson(res, status, body) {
  if (typeof res.writeHead !== "function" || res.headersSent) return res.destroy?.();
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

/**
 * Reverse proxy to one upstream service. Without a timeout a hung service would hold client
 * connections open forever; without an error handler the client gets a raw stack/connection reset.
 * This is where a circuit breaker would later sit.
 */
export function createUpstreamProxy(route) {
  return createProxyMiddleware({
    target: route.target,
    changeOrigin: true,
    pathRewrite: { [`^${route.prefix}`]: "" },
    proxyTimeout: env.UPSTREAM_TIMEOUT_MS,
    on: {
      error: (err, req, res) => {
        const unreachable = UNREACHABLE.has(err.code);
        console.error(`[proxy] ${route.name} upstream error (${err.code ?? err.message}) requestId=${req.id}`);
        sendJson(res, unreachable ? 502 : 504, {
          message: unreachable ? "Upstream service unavailable" : "Upstream service timed out",
          requestId: req.id,
        });
      },
    },
  });
}
