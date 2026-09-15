import redis from "../services/redis.service.js";

const DEFAULT_RATE_LIMIT = 10; // Maximum number of requests per minute
const DEFAULT_WINDOW_SIZE = 60; // Window size in seconds

const rateLimiter = (rateLimit, window) => {

  return async (req, res, next) => {

    const RATE_LIMIT = rateLimit || DEFAULT_RATE_LIMIT;
    const WINDOW_SIZE = window || DEFAULT_WINDOW_SIZE;

    const ip = req.ip;
    const userId = req.headers['x-user-id'] ?? null;

    const RATE_LIMIT_KEY = userId ? `rate_limit:user:${userId}` : `rate_limit:${ip}`;

    const count = await redis.INCR(RATE_LIMIT_KEY);

    if (count && parseInt(count) > RATE_LIMIT) {
      return res.status(429).json({ message: "Too many requests" });
    }
    if (count === 1) {
      await redis.expire(RATE_LIMIT_KEY, WINDOW_SIZE);
    }
    next();
  };
};

export default rateLimiter;

export const LoginRateLimiter = rateLimiter(5, 60); // Example: 5 requests per minute for login
export const SignupRateLimiter = rateLimiter(3, 60); // Example: 3 requests per minute for signup
export const DefaultRateLimiter = rateLimiter(); // Example: default rate limiter with 10 requests per minute
