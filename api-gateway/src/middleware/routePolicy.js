import { authenticate, authorize } from "./auth.middleware.js";
import { rateLimit } from "./rateLimiter.js";

/** "/users/:id" -> /^\/users\/[^/]+$/ */
function pathToRegExp(path) {
  const pattern = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/:\w+/g, "[^/]+");
  return new RegExp(`^${pattern}$`);
}

/** Runs handlers in order; unlike express, also forwards rejected promises to next(err). */
function runChain(handlers, req, res, next) {
  let i = 0;
  const step = (err) => {
    if (err) return next(err);
    const handler = handlers[i++];
    if (!handler) return next();
    try {
      Promise.resolve(handler(req, res, step)).catch(next);
    } catch (error) {
      next(error);
    }
  };
  step();
}

function compileRule(route, rule) {
  const merged = { ...route.defaults, ...rule };
  const handlers = [];

  // Order matters: authenticate first so the rate limiter can key on the verified user.
  if (merged.auth || merged.roles) handlers.push(authenticate);
  if (merged.roles) handlers.push(authorize(merged.roles));
  handlers.push(rateLimit({ name: `${route.name}:${merged.name ?? "default"}`, ...merged.rateLimit }));

  return {
    matches: (req) =>
      (!rule.path || pathToRegExp(rule.path).test(req.path)) &&
      (!rule.method || rule.method === req.method),
    handlers,
  };
}

/** Applies the first matching rule of `route` (auth -> roles -> rate limit), or its defaults. */
export function routePolicy(route) {
  const rules = route.rules.map((rule) => compileRule(route, rule));
  const fallback = compileRule(route, {});

  return (req, res, next) => {
    const rule = rules.find((r) => r.matches(req)) ?? fallback;
    runChain(rule.handlers, req, res, next);
  };
}
