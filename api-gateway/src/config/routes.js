import { env } from "./env.js";

const perMinute = (limit) => ({ limit, windowSeconds: 60 });

export const LIMITS = {
  login: perMinute(5),
  signup: perMinute(3),
  default: perMinute(10),
};

/**
 * The gateway's whole policy in one place.
 *
 * Each route proxies `prefix/*` to `target` (prefix is stripped). Requests are matched against
 * `rules` top to bottom (first match wins, so put specific paths before `/:param` ones);
 * anything that matches no rule gets `defaults`.
 *
 * Rule fields:
 *   path       express-style path relative to the prefix ("/", "/me", "/:id")
 *   method     optional; omit to match any method
 *   auth       true -> a valid JWT is required
 *   roles      optional; implies auth, caller must have one of these roles (else 403)
 *   rateLimit  { limit, windowSeconds }
 *   name       optional label; part of the Redis rate-limit key and the access log
 */
export const routes = [
  {
    name: "auth",
    prefix: "/auth",
    target: env.AUTH_SERVICE_URL,
    defaults: { auth: false, rateLimit: LIMITS.default },
    rules: [
      { name: "login", method: "POST", path: "/login", rateLimit: LIMITS.login },
      { name: "register", method: "POST", path: "/register", rateLimit: LIMITS.signup },
    ],
  },
  {
    name: "users",
    prefix: "/users",
    target: env.USER_SERVICE_URL,
    defaults: { auth: false, rateLimit: LIMITS.default },
    rules: [
      { name: "list", path: "/", roles: ["ADMIN"] },
      { name: "me", path: "/me", auth: true },
      // GET /users/:id is public and falls through to `defaults`.
    ],
  },
  {
    name: "posts",
    prefix: "/posts",
    target: env.POST_SERVICE_URL,
    defaults: { auth: false, rateLimit: LIMITS.default },
    rules: [
      { name: "create", method: "POST", path: "/", auth: true },
      { name: "mine", path: "/me", auth: true },
      // GET /posts/:id is public and falls through to `defaults`.
    ],
  },
];
