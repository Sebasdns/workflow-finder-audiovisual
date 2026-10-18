import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  buildGenerateMessages,
  buildGenerateSystemPrompt,
  type GenerateBlueprintInput
} from "../src/services/nebius.js";

const fixedNow = new Date(2026, 9, 18, 12, 0, 0);
const input: GenerateBlueprintInput = {
  brief: "A short audiovisual sequence",
  duration: null,
  deadline: "3 days",
  available_tools: [],
  expected_deliverable: null
};

test("generate prompt receives a dynamic current date and server timezone context", () => {
  const prompt = buildGenerateSystemPrompt(fixedNow, "Europe/Madrid");
  assert.match(prompt, /Current date: 2026-10-18/);
  assert.match(prompt, /Current timezone: Europe\/Madrid \(UTC[+-]\d{2}:\d{2}\)/);
});

test("generate prompt guards against historical dates and grounds relative deadlines", () => {
  const prompt = buildGenerateSystemPrompt(fixedNow, "Europe/Madrid");
  assert.match(prompt, /Never generate due dates earlier than the current date/);
  assert.match(prompt, /relative deadline such as "3 days"/);
  assert.match(prompt, /calculate production dates forward from the current date/);
  assert.match(prompt, /internally consistent with that deadline/);
  assert.match(prompt, /Do not invent unrelated historical dates/);
});

test("relative deadline remains intact beside the authoritative temporal context", () => {
  const messages = buildGenerateMessages(input, fixedNow, "Europe/Madrid");
  assert.equal(messages[0]?.role, "system");
  assert.match(messages[0]?.content ?? "", /Current date: 2026-10-18/);
  assert.equal(messages[1]?.role, "user");
  assert.equal(JSON.parse(messages[1]?.content ?? "{}").deadline, "3 days");
});

test("generate prompt contains no fixed 2025 historical date", () => {
  assert.doesNotMatch(buildGenerateSystemPrompt(fixedNow, "Europe/Madrid"), /2025/);
});

test("frozen schema remains unchanged", () => {
  const schema = readFileSync(new URL("../src/schemas/blueprint.schema.json", import.meta.url));
  assert.equal(
    createHash("sha256").update(schema).digest("hex").toUpperCase(),
    "3BBE3EADB9808967046BA87EC3DA273CB612E479D88490657FE5D7CD3875F476"
  );
});

test("date context is isolated from revise and model remains environment-configured", () => {
  const source = readFileSync(new URL("../src/services/nebius.ts", import.meta.url), "utf8");
  const reviseSource = source.split("export async function reviseBlueprintWithNebius")[1] ?? "";
  assert.doesNotMatch(reviseSource, /buildGenerateMessages|Current date:|Current timezone:/);
  assert.match(source, /const model = process\.env\.NEBIUS_MODEL/);
  assert.doesNotMatch(source, /nvidia\/nemotron-3-super-120b-a12b/);
});

test("backend source contains no fixed 2025 date", () => {
  const source = readFileSync(new URL("../src/services/nebius.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /2025-\d{2}-\d{2}/);
});
