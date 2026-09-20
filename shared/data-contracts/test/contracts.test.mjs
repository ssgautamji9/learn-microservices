import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const { assertValidEvent, isValidEvent, ContractValidationError } = createRequire(import.meta.url)("../dist/index.js");

const valid = () => ({
  eventId: "6f1c6a3e-8b0f-4c0a-9d55-3a1e7d2b9f10",
  event: "user.created",
  userId: "user-123",
  email: "user@example.com",
  name: "Shivam",
  role: "USER",
  createdAt: new Date().toISOString(),
});

test("accepts a valid user.created payload", () => {
  assert.equal(isValidEvent("user.created", valid()), true);
});

test("rejects a missing required field", () => {
  const { userId, ...bad } = valid();
  assert.throws(() => assertValidEvent("user.created", bad), ContractValidationError);
});

test("rejects unknown fields (additionalProperties: false)", () => {
  assert.equal(isValidEvent("user.created", { ...valid(), extra: 1 }), false);
});

test("rejects bad formats and enum values", () => {
  assert.equal(isValidEvent("user.created", { ...valid(), email: "nope" }), false);
  assert.equal(isValidEvent("user.created", { ...valid(), eventId: "123" }), false);
  assert.equal(isValidEvent("user.created", { ...valid(), createdAt: "yesterday" }), false);
  assert.equal(isValidEvent("user.created", { ...valid(), role: "SUPERUSER" }), false);
});
