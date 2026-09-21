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

const validUpdated = () => ({
  eventId: "6f1c6a3e-8b0f-4c0a-9d55-3a1e7d2b9f10",
  event: "user.updated",
  userId: "user-123",
  displayName: "Shivam",
  updatedAt: new Date().toISOString(),
});

test("user.updated: accepts a valid payload", () => {
  assert.equal(isValidEvent("user.updated", validUpdated()), true);
});

test("user.updated: rejects wrong event const, empty name and extra fields", () => {
  assert.equal(isValidEvent("user.updated", { ...validUpdated(), event: "user.created" }), false);
  assert.equal(isValidEvent("user.updated", { ...validUpdated(), displayName: "" }), false);
  assert.equal(isValidEvent("user.updated", { ...validUpdated(), extra: 1 }), false);
});

test("a user.created payload does not satisfy the user.updated contract", () => {
  assert.equal(isValidEvent("user.updated", valid()), false);
});
