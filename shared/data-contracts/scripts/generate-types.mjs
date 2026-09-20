// Generates TypeScript types from the JSON Schemas so the schema stays the single source of truth.
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "json-schema-to-typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const eventsDir = path.join(root, "schemas", "events");
const outDir = path.join(root, "src", "generated");

const files = (await readdir(eventsDir)).filter((f) => f.endsWith(".json")).sort();
let output = "/* eslint-disable */\n// AUTO-GENERATED from schemas/events/*.json by scripts/generate-types.mjs. Do not edit.\n\n";

for (const file of files) {
  const schema = JSON.parse(await readFile(path.join(eventsDir, file), "utf8"));
  output += await compile(schema, schema.title, { bannerComment: "", additionalProperties: false });
}

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "events.ts"), output);
console.log(`Generated types for ${files.length} schema(s)`);
