import fs from "node:fs";
import path from "node:path";
import Ajv2020, { ErrorObject, ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import type { UserCreatedV1, UserUpdatedV1 } from "./generated/events";

export type { UserCreatedV1, UserUpdatedV1 } from "./generated/events";

/**
 * Event name (also the RabbitMQ routing key) -> payload type.
 * Add a line here (and a schema file below) when introducing a new event.
 */
export interface EventMap {
  "user.created": UserCreatedV1;
  "user.updated": UserUpdatedV1;
}

export type EventName = keyof EventMap;

// The .json files are the language-neutral contract; TS types and validators are derived from them.
const SCHEMA_FILES: Record<EventName, string> = {
  "user.created": "user.created.v1.json",
  "user.updated": "user.updated.v1.json",
};

const schemasDir = path.join(__dirname, "..", "schemas", "events");

export function loadSchema(name: EventName): object {
  return JSON.parse(fs.readFileSync(path.join(schemasDir, SCHEMA_FILES[name]), "utf8"));
}

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);

const validators = {} as Record<EventName, ValidateFunction>;
for (const name of Object.keys(SCHEMA_FILES) as EventName[]) {
  validators[name] = ajv.compile(loadSchema(name));
}

export class ContractValidationError extends Error {
  constructor(
    public readonly eventName: EventName,
    public readonly errors: ErrorObject[],
  ) {
    super(
      `Payload violates contract '${eventName}': ` +
        errors.map((e) => `${e.instancePath || "/"} ${e.message}`).join("; "),
    );
    this.name = "ContractValidationError";
  }
}

/** Runtime check that also narrows `data` to the generated type. */
export function isValidEvent<K extends EventName>(name: K, data: unknown): data is EventMap[K] {
  return validators[name](data) as boolean;
}

/** Returns the typed payload or throws ContractValidationError. */
export function assertValidEvent<K extends EventName>(name: K, data: unknown): EventMap[K] {
  const validate = validators[name];
  if (!validate(data)) {
    throw new ContractValidationError(name, [...(validate.errors ?? [])]);
  }
  return data as EventMap[K];
}
