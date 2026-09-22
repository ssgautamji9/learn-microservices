import { randomUUID } from "node:crypto";

/**
 * First middleware on every request.
 *
 * 1. Security: strip identity headers a client may have sent. Downstream services trust
 *    X-User-Id / X-User-Role, so only the gateway (after verifying the JWT) may set them.
 * 2. Correlation: give the request an id, forward it to upstreams and return it to the client.
 *    Grepping one id across gateway + service logs is the first step towards distributed tracing.
 * 3. Access log: one structured line per request, written when the response finishes.
 */
export function requestContext(req, res, next) {
  delete req.headers["x-user-id"];
  delete req.headers["x-user-role"];

  // Always generate at the edge; never trust a client-supplied id (log forging / collisions).
  req.id = randomUUID();
  req.headers["x-request-id"] = req.id;
  res.setHeader("X-Request-Id", req.id);

  const start = process.hrtime.bigint();
  res.on("finish", () => {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        durationMs: Number((process.hrtime.bigint() - start) / 1_000_000n),
        userId: req.user?.id ?? null,
        ip: req.ip,
      }),
    );
  });

  next();
}
