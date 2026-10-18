import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { Ajv2020 } from "ajv/dist/2020.js";
import formatsPlugin from "ajv-formats";
import blueprintSchema from "./schemas/blueprint.schema.json" with { type: "json" };
import {
  generateBlueprintWithNebius,
  ModelServiceError,
  reviseBlueprintWithNebius,
  type GenerateBlueprintInput,
  type HumanDecision
} from "./services/nebius.js";

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
const addFormats = formatsPlugin as unknown as (instance: Ajv2020) => Ajv2020;
addFormats(ajv);
const validateBlueprint = ajv.compile(blueprintSchema);

const MAX_BODY_BYTES = 1_000_000;

type GenerateInput = GenerateBlueprintInput;

type RevisionInput = {
  blueprint: Record<string, unknown>;
  decision: HumanDecision;
};

type BlueprintChange = {
  element_type: string;
  element_id?: string;
  change_type: "added" | "removed" | "modified";
};

type BlueprintServices = {
  generateBlueprint: typeof generateBlueprintWithNebius;
  reviseBlueprint: typeof reviseBlueprintWithNebius;
  preserveRevisedBlueprintCandidate?: (
    blueprint: Record<string, unknown>
  ) => Promise<void>;
};

async function preserveRevisedBlueprintCandidate(
  blueprint: Record<string, unknown>
): Promise<void> {
  const candidatePath = resolve(
    process.cwd(),
    "../handoff/e2e/LAST_SCHEMA_VALID_REVISE_CANDIDATE.json"
  );
  await writeFile(candidatePath, `${JSON.stringify(blueprint, null, 2)}\n`, "utf8");
}

const defaultBlueprintServices: BlueprintServices = {
  generateBlueprint: generateBlueprintWithNebius,
  reviseBlueprint: reviseBlueprintWithNebius,
  preserveRevisedBlueprintCandidate
};

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error("REQUEST_BODY_TOO_LARGE");
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    throw new Error("EMPTY_BODY");
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isGenerateInput(value: unknown): value is GenerateInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const input = value as Record<string, unknown>;
  const allowedKeys = new Set([
    "brief",
    "duration",
    "deadline",
    "available_tools",
    "expected_deliverable"
  ]);

  return (
    Object.keys(input).length === allowedKeys.size &&
    Object.keys(input).every((key) => allowedKeys.has(key)) &&
    typeof input.brief === "string" &&
    input.brief.trim().length > 0 &&
    isNullableString(input.duration) &&
    isNullableString(input.deadline) &&
    Array.isArray(input.available_tools) &&
    input.available_tools.every((tool) => typeof tool === "string") &&
    isNullableString(input.expected_deliverable)
  );
}

function isRevisionInput(value: unknown): value is RevisionInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const input = value as Record<string, unknown>;
  if (
    Object.keys(input).length !== 2 ||
    !("blueprint" in input) ||
    !("decision" in input) ||
    typeof input.blueprint !== "object" ||
    input.blueprint === null ||
    Array.isArray(input.blueprint) ||
    typeof input.decision !== "object" ||
    input.decision === null ||
    Array.isArray(input.decision)
  ) {
    return false;
  }

  const decision = input.decision as Record<string, unknown>;
  return (
    Object.keys(decision).length === 3 &&
    typeof decision.conflict_id === "string" &&
    decision.conflict_id.trim().length > 0 &&
    typeof decision.selected_option === "string" &&
    decision.selected_option.trim().length > 0 &&
    typeof decision.comment === "string"
  );
}

function hasConflict(blueprint: Record<string, unknown>, conflictId: string): boolean {
  return (
    Array.isArray(blueprint.conflicts) &&
    blueprint.conflicts.some(
      (conflict) =>
        typeof conflict === "object" &&
        conflict !== null &&
        (conflict as Record<string, unknown>).conflict_id === conflictId
    )
  );
}

function jsonEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function collectEntityChanges(
  changes: BlueprintChange[],
  elementType: string,
  idKey: string,
  beforeItems: unknown,
  afterItems: unknown
): void {
  const before = Array.isArray(beforeItems) ? beforeItems : [];
  const after = Array.isArray(afterItems) ? afterItems : [];
  const beforeById = new Map(
    before
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => [String(item[idKey]), item])
  );
  const afterById = new Map(
    after
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => [String(item[idKey]), item])
  );

  for (const [id, beforeItem] of beforeById) {
    const afterItem = afterById.get(id);
    if (!afterItem) {
      changes.push({ element_type: elementType, element_id: id, change_type: "removed" });
    } else if (!jsonEqual(beforeItem, afterItem)) {
      changes.push({ element_type: elementType, element_id: id, change_type: "modified" });
    }
  }
  for (const id of afterById.keys()) {
    if (!beforeById.has(id)) {
      changes.push({ element_type: elementType, element_id: id, change_type: "added" });
    }
  }
}

function collectBlueprintChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): BlueprintChange[] {
  const changes: BlueprintChange[] = [];

  if (!jsonEqual(before.objective, after.objective)) {
    changes.push({ element_type: "objective", change_type: "modified" });
  }
  if (!jsonEqual(before.constraints, after.constraints)) {
    changes.push({ element_type: "constraints", change_type: "modified" });
  }

  collectEntityChanges(
    changes,
    "character",
    "character_id",
    before.character_requirements,
    after.character_requirements
  );

  const beforeWorld = before.world_requirements as Record<string, unknown>;
  const afterWorld = after.world_requirements as Record<string, unknown>;
  const { locations: beforeLocations, ...beforeWorldDetails } = beforeWorld;
  const { locations: afterLocations, ...afterWorldDetails } = afterWorld;
  if (!jsonEqual(beforeWorldDetails, afterWorldDetails)) {
    changes.push({ element_type: "world_requirements", change_type: "modified" });
  }
  collectEntityChanges(changes, "location", "location_id", beforeLocations, afterLocations);

  const beforeScenes = before.scenes as Array<Record<string, unknown>>;
  const afterScenes = after.scenes as Array<Record<string, unknown>>;
  const sceneDetails = (scenes: Array<Record<string, unknown>>) =>
    scenes.map(({ shots: _shots, ...scene }) => scene);
  const shots = (scenes: Array<Record<string, unknown>>) =>
    scenes.flatMap((scene) =>
      Array.isArray(scene.shots)
        ? scene.shots.map((shot) => ({
            ...(shot as Record<string, unknown>),
            scene_id: scene.scene_id
          }))
        : []
    );
  collectEntityChanges(
    changes,
    "scene",
    "scene_id",
    sceneDetails(beforeScenes),
    sceneDetails(afterScenes)
  );
  collectEntityChanges(changes, "shot", "shot_id", shots(beforeScenes), shots(afterScenes));

  collectEntityChanges(changes, "dependency", "dependency_id", before.dependencies, after.dependencies);
  collectEntityChanges(changes, "conflict", "conflict_id", before.conflicts, after.conflicts);
  collectEntityChanges(
    changes,
    "approval_gate",
    "approval_gate_id",
    before.approval_gates,
    after.approval_gates
  );
  collectEntityChanges(changes, "next_step", "step_id", before.next_steps, after.next_steps);

  return changes;
}

function normalizedText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function validateRevisionPostconditions(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  decision: HumanDecision,
  changes: BlueprintChange[]
): string | null {
  if (jsonEqual(before, after)) {
    return "El Blueprint revisado es idéntico al original";
  }

  const originalConflict = Array.isArray(before.conflicts)
    ? before.conflicts.find(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          (item as Record<string, unknown>).conflict_id === decision.conflict_id
      ) as Record<string, unknown> | undefined
    : undefined;
  const revisedConflict = Array.isArray(after.conflicts)
    ? after.conflicts.find(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          (item as Record<string, unknown>).conflict_id === decision.conflict_id
      ) as Record<string, unknown> | undefined
    : undefined;

  if (!revisedConflict || revisedConflict.decision_required !== false) {
    return "El conflicto seleccionado sigue requiriendo decisión humana";
  }

  if (
    typeof revisedConflict.resolution_notes !== "string" ||
    revisedConflict.resolution_notes.trim().length === 0
  ) {
    return "La resolución del conflicto está vacía";
  }

  const selectedOption = normalizedText(decision.selected_option);

  const approvalGateId = originalConflict?.approval_gate_id;
  if (typeof approvalGateId !== "string") {
    return "El conflicto seleccionado no tiene approval gate relacionado";
  }

  const revisedGate = Array.isArray(after.approval_gates)
    ? after.approval_gates.find(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          (item as Record<string, unknown>).approval_gate_id === approvalGateId
      ) as Record<string, unknown> | undefined
    : undefined;

  if (!revisedGate || revisedGate.status !== "approved") {
    return "El approval gate relacionado no está aprobado";
  }
  if (
    typeof revisedGate.proposed_decision !== "string" ||
    normalizedText(revisedGate.proposed_decision) !== selectedOption
  ) {
    return "El approval gate no refleja la opción humana seleccionada";
  }

  const humanDecision = revisedGate.human_decision;
  if (typeof humanDecision !== "object" || humanDecision === null || Array.isArray(humanDecision)) {
    return "El approval gate no contiene la decisión humana";
  }
  const recordedDecision = humanDecision as Record<string, unknown>;
  if (recordedDecision.action !== "approve") {
    return "La decisión humana del approval gate no está aprobada";
  }
  if (
    decision.comment.trim().length > 0 &&
    recordedDecision.notes !== decision.comment
  ) {
    return "El approval gate no conserva el comentario humano";
  }

  if (changes.length === 0) {
    return "La revisión no produjo cambios";
  }
  if (
    !changes.some(
      (change) =>
        change.element_type === "conflict" &&
        change.element_id === decision.conflict_id &&
        change.change_type === "modified"
    )
  ) {
    return "La revisión no modificó el conflicto seleccionado";
  }
  if (
    !changes.some(
      (change) =>
        change.element_type === "approval_gate" &&
        change.element_id === approvalGateId &&
        change.change_type === "modified"
    )
  ) {
    return "La revisión no modificó el approval gate relacionado";
  }

  return null;
}

export function createApiServer(services: BlueprintServices = defaultBlueprintServices) {
  return createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, { status: "ok" });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/blueprint/generate") {
      try {
        const input = await readJsonBody(request);
        if (!isGenerateInput(input)) {
          sendJson(response, 400, {
            error: "INVALID_INPUT",
            message: "El cuerpo de la solicitud no cumple el contrato esperado"
          });
          return;
        }

        const blueprint = await services.generateBlueprint(input);
        if (!validateBlueprint(blueprint)) {
          console.info(
            "Blueprint schema diagnostics",
            validateBlueprint.errors?.map(({ instancePath, keyword, message }) => ({
              instancePath,
              keyword,
              message
            }))
          );
          sendJson(response, 502, {
            error: "SCHEMA_VALIDATION_ERROR",
            message: "La salida del modelo no cumple el schema"
          });
          return;
        }

        sendJson(response, 200, blueprint);
      } catch (error) {
        if (error instanceof ModelServiceError) {
          sendJson(response, error.code === "MODEL_TIMEOUT" ? 504 : 502, {
            error: error.code,
            message: error.message
          });
          return;
        }
        sendJson(response, 400, {
          error: "INVALID_INPUT",
          message: "El cuerpo debe contener JSON válido"
        });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/blueprint/revise") {
      try {
        const input = await readJsonBody(request);
        if (!isRevisionInput(input) || !validateBlueprint(input.blueprint)) {
          sendJson(response, 400, {
            error: "INVALID_INPUT",
            message: "El cuerpo de la solicitud no cumple el contrato esperado"
          });
          return;
        }

        if (!hasConflict(input.blueprint, input.decision.conflict_id)) {
          sendJson(response, 400, {
            error: "INVALID_INPUT",
            message: "El conflict_id no existe en el Blueprint"
          });
          return;
        }

        const revisedBlueprint = await services.reviseBlueprint(
          input.blueprint,
          input.decision
        );
        if (!validateBlueprint(revisedBlueprint)) {
          console.info(
            "Revised blueprint schema diagnostics",
            validateBlueprint.errors?.map(({ instancePath, keyword, message }) => ({
              instancePath,
              keyword,
              message
            }))
          );
          sendJson(response, 502, {
            error: "SCHEMA_VALIDATION_ERROR",
            message: "La salida del modelo no cumple el schema"
          });
          return;
        }

        const blueprint = revisedBlueprint as Record<string, unknown>;
        if (services.preserveRevisedBlueprintCandidate) {
          await services.preserveRevisedBlueprintCandidate(blueprint);
        }
        const changes = collectBlueprintChanges(input.blueprint, blueprint);
        const postconditionError = validateRevisionPostconditions(
          input.blueprint,
          blueprint,
          input.decision,
          changes
        );
        if (postconditionError) {
          sendJson(response, 502, {
            error: "INVALID_MODEL_OUTPUT",
            message: postconditionError
          });
          return;
        }

        sendJson(response, 200, {
          blueprint,
          changes
        });
      } catch (error) {
        if (error instanceof ModelServiceError) {
          sendJson(response, error.code === "MODEL_TIMEOUT" ? 504 : 502, {
            error: error.code,
            message: error.message
          });
          return;
        }
        sendJson(response, 400, {
          error: "INVALID_INPUT",
          message: "El cuerpo debe contener JSON válido"
        });
      }
      return;
    }

    sendJson(response, 404, { error: "NOT_FOUND" });
  });
}

const isMainModule = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isMainModule) {
  const port = Number(process.env.PORT ?? 3000);
  createApiServer().listen(port, "127.0.0.1", () => {
    console.log(`API listening on http://127.0.0.1:${port}`);
  });
}
