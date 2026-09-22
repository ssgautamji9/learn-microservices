import { test, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import jwt from "jsonwebtoken";

// --- fake Redis: mirrors the exact multi().incr().expire(..., "NX").ttl().exec() chain the limiter uses
const store = new Map();
let redisDown = false;
const fakeRedis = {
  multi() {
    const ops = [];
    const chain = {
      incr: (k) => (ops.push(() => { const e = store.get(k) ?? { count: 0, ttl: -1 }; e.count++; store.set(k, e); return e.count; }), chain),
      expire: (k, w, mode) => (ops.push(() => { const e = store.get(k); if (mode !== "NX" || e.ttl === -1) e.ttl = w; return 1; }), chain),
      ttl: (k) => (ops.push(() => store.get(k).ttl), chain),
      exec: async () => { if (redisDown) throw new Error("redis down"); return ops.map((op) => op()); },
    };
    return chain;
  },
};
mock.module(new URL("../src/services/redis.service.js", import.meta.url).href, { defaultExport: fakeRedis });

// --- fake upstream services: echo what they receive
const echo = () =>
  http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ url: req.url, method: req.method, headers: req.headers }));
  });
const listen = (server) => new Promise((r) => server.listen(0, "127.0.0.1", () => r(server.address().port)));

const SECRET = "test-secret";
const upstreams = { auth: echo(), users: echo(), posts: echo() };
let base;
let gateway;

before(async () => {
  const ports = {};
  for (const [name, server] of Object.entries(upstreams)) ports[name] = await listen(server);
  Object.assign(process.env, {
    JWT_SECRET: SECRET,
    REDIS_URL: "redis://unused",
    AUTH_SERVICE_URL: `http://127.0.0.1:${ports.auth}`,
    USER_SERVICE_URL: `http://127.0.0.1:${ports.users}`,
    POST_SERVICE_URL: `http://127.0.0.1:${ports.posts}`,
    UPSTREAM_TIMEOUT_MS: "1000",
  });
  const { default: app } = await import("../src/app.js");
  gateway = http.createServer(app);
  base = `http://127.0.0.1:${await listen(gateway)}`;
});

after(() => {
  gateway.close();
  Object.values(upstreams).forEach((s) => s.close());
});

const token = (sub, role = "USER") => jwt.sign({ sub, role }, SECRET);
const get = (path, headers = {}) => fetch(base + path, { headers });

test("health", async () => {
  const res = await get("/health");
  assert.equal(res.status, 200);
  assert.equal((await res.json()).service, "api-gateway");
});

test("client-supplied identity headers are stripped on public routes", async () => {
  const res = await get("/users/abc", { "x-user-id": "evil", "x-user-role": "ADMIN" });
  const seen = await res.json();
  assert.equal(seen.url, "/abc");
  assert.equal(seen.headers["x-user-id"], undefined);
  assert.equal(seen.headers["x-user-role"], undefined);
});

test("request id is generated, returned and forwarded (client value ignored)", async () => {
  const res = await get("/users/abc", { "x-request-id": "client-chosen" });
  const id = res.headers.get("x-request-id");
  assert.match(id, /^[0-9a-f-]{36}$/);
  assert.equal((await res.json()).headers["x-request-id"], id);
});

test("POST /posts requires auth, then forwards the verified identity", async () => {
  assert.equal((await fetch(`${base}/posts`, { method: "POST" })).status, 401);
  assert.equal((await get("/posts/me", { authorization: "Bearer garbage" })).status, 401);

  const res = await fetch(`${base}/posts`, { method: "POST", headers: { authorization: `Bearer ${token("u1")}`, "x-user-id": "evil" } });
  const seen = await res.json();
  assert.equal(seen.url, "/");
  assert.equal(seen.headers["x-user-id"], "u1");
});

test("GET /posts/:id stays public", async () => {
  assert.equal((await get("/posts/123")).status, 200);
});

test("GET /users is ADMIN only: 401 without token, 403 for USER, 200 for ADMIN", async () => {
  assert.equal((await get("/users")).status, 401);
  assert.equal((await get("/users", { authorization: `Bearer ${token("u1", "USER")}` })).status, 403);
  assert.equal((await get("/users", { authorization: `Bearer ${token("a1", "ADMIN")}` })).status, 200);
});

test("login is limited to 5/min per IP with Retry-After, and has its own counter", async () => {
  const login = () => fetch(`${base}/auth/login`, { method: "POST" });
  for (let i = 0; i < 5; i++) assert.equal((await login()).status, 200);
  const limited = await login();
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("x-ratelimit-remaining"), "0");
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
  // a different policy for the same IP is unaffected
  assert.equal((await get("/users/abc")).status, 200);
});

test("a spoofed x-user-id cannot dodge the IP limit", async () => {
  let last;
  for (let i = 0; i < 12; i++) last = await get("/auth/whatever", { "x-user-id": `fake-${i}` });
  assert.equal(last.status, 429); // default policy = 10/min per IP
});

test("rate limiter fails open when Redis is down", async () => {
  redisDown = true;
  assert.equal((await get("/auth/whatever")).status, 200);
  redisDown = false;
});

test("unknown route -> JSON 404", async () => {
  const res = await get("/nope");
  assert.equal(res.status, 404);
  assert.ok((await res.json()).requestId);
});

test("upstream down -> JSON 502 instead of a hung/reset connection", async () => {
  await new Promise((r) => upstreams.users.close(r));
  const res = await get("/users/abc");
  assert.equal(res.status, 502);
  assert.equal((await res.json()).message, "Upstream service unavailable");
});
