import redis from "../services/redis.service.js";

/**
 * Fixed-window rate limiter backed by Redis.
 *
 * Key = policy name + subject, so /auth/login and /users/* no longer share one counter.
 * Subject = verified user id when authenticated, otherwise the client IP.
 */
export function rateLimit({ name, limit, windowSeconds }) {
  return async (req, res, next) => {
    const subject = req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
    const key = `rate_limit:${name}:${subject}`;

    let count;
    let ttl;
    try {
      // MULTI/EXEC runs all three commands atomically. EXPIRE ... NX sets the TTL only if the key
      // has none, so a crash between INCR and EXPIRE can't leave a counter that never resets.
      [count, , ttl] = await redis.multi().incr(key).expire(key, windowSeconds, "NX").ttl(key).exec();
    } catch (error) {
      // Fail open: if Redis is down we'd rather serve traffic unlimited than take the whole API down.
      // (Login/payment endpoints often choose to fail closed instead.)
      console.error(`[rate-limit] Redis error, allowing request: ${error.message}`);
      return next();
    }

    res.set("X-RateLimit-Limit", String(limit));
    res.set("X-RateLimit-Remaining", String(Math.max(0, limit - count)));

    if (count > limit) {
      res.set("Retry-After", String(Math.max(ttl, 1)));
      return res.status(429).json({ message: "Too many requests. Please try again later." });
    }
    next();
  };
}
