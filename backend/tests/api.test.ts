import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";

import { Ajv2020 } from "ajv/dist/2020.js";
import formatsPlugin from "ajv-formats";

import { createApiServer } from "../src/server.js";
import blueprintSchema from "../src/schemas/blueprint.schema.json" with { type: "json" };

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
const addFormats = formatsPlugin as unknown as (instance: Ajv2020) => Ajv2020;
addFormats(ajv);
const validateBlueprint = ajv.compile(blueprintSchema);

function createValidBlueprint() {
  return {
    schema_version: "0.1",
    objective: {
      summary: "Vídeo de presentación de una cafetería",
      deliverables: ["Vídeo horizontal de 30 segundos"]
    },
    constraints: {
      schedule: "Dos semanas"
    },
    character_requirements: [
      {
        character_id: "character_01",
        name: "Barista",
        description: "Protagonista que prepara el café"
      }
    ],
    world_requirements: {
      locations: [
        {
          location_id: "location_01",
          name: "Cafetería",
          description: "Interior de una cafetería artesanal",
          interior_exterior: "interior"
        }
      ]
    },
    scenes: [
      {
        scene_id: "scene_01",
        title: "Preparación",
        description: "La barista prepara el café",
        location_id: "location_01",
        character_ids: ["character_01"],
        time_of_day: "noche",
        shots: [
          {
            shot_id: "shot_01",
            description: "Preparación del café",
            shot_size: "Plano medio",
            camera_directions: {
              framing: "Barista centrada",
              movement: "Cámara fija"
            },
            character_ids: ["character_01"],
            location_id: "location_01"
          }
        ]
      }
    ],
    dependencies: [
      {
        dependency_id: "dependency_01",
        dependent_element: { element_type: "scene", element_id: "scene_01" },
        required_element: { element_type: "location", element_id: "location_01" },
        description: "La escena requiere la cafetería",
        status: "unresolved"
      }
    ],
    conflicts: [
      {
        conflict_id: "conflict_01",
        description: "La cafetería no está disponible de noche",
        severity: "high",
        affected_elements: [{ element_type: "scene", element_id: "scene_01" }],
        decision_required: true,
        approval_gate_id: "approval_01"
      }
    ],
    approval_gates: [
      {
        approval_gate_id: "approval_01",
        description: "Decidir el horario de rodaje",
        conflict_ids: ["conflict_01"],
        proposed_decision: "Cambiar el rodaje al amanecer",
        status: "pending"
      }
    ],
    next_steps: [
      {
        step_id: "step_01",
        action: "Confirmar el horario con la localización",
        production_area: "locations",
        status: "pending",
        approval_gate_id: "approval_01"
      }
    ]
  };
}

test("health and invalid input contracts", async () => {
  const server = createApiServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  assert(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthResponse.status, 200);
    assert.deepEqual(await healthResponse.json(), { status: "ok" });

    const invalidResponse = await fetch(`${baseUrl}/api/blueprint/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ brief: "Faltan campos" })
    });
    assert.equal(invalidResponse.status, 400);
    assert.deepEqual(await invalidResponse.json(), {
      error: "INVALID_INPUT",
      message: "El cuerpo de la solicitud no cumple el contrato esperado"
    });
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("generate returns a schema-valid Blueprint without calling Nebius", async () => {
  const expectedBlueprint = createValidBlueprint();
  let generateCalls = 0;
  const server = createApiServer({
    generateBlueprint: async () => {
      generateCalls += 1;
      return structuredClone(expectedBlueprint);
    },
    reviseBlueprint: async () => {
      throw new Error("Revision service must not be called");
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  assert(address && typeof address === "object");

  try {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/blueprint/generate`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brief: "Vídeo de presentación de una cafetería",
          duration: "30 segundos",
          deadline: null,
          available_tools: ["cámara", "trípode"],
          expected_deliverable: "Vídeo horizontal de 30 segundos"
        })
      }
    );
    const blueprint = await response.json();

    assert.equal(response.status, 200);
    assert.equal(generateCalls, 1);
    assert.deepEqual(blueprint, expectedBlueprint);
    assert.equal(validateBlueprint(blueprint), true, ajv.errorsText(validateBlueprint.errors));
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("revise returns a schema-valid Blueprint and changes without calling Nebius", async () => {
  const originalBlueprint = createValidBlueprint();
  const revisedBlueprint = structuredClone(originalBlueprint);
  revisedBlueprint.scenes[0].time_of_day = "amanecer";
  const revisedConflict = revisedBlueprint.conflicts[0] as typeof revisedBlueprint.conflicts[0] & {
    resolution_notes?: string;
  };
  const revisedGate = revisedBlueprint.approval_gates[0] as typeof revisedBlueprint.approval_gates[0] & {
    human_decision?: { action: string; notes: string };
  };
  revisedConflict.decision_required = false;
  revisedConflict.resolution_notes = "Cambiar la escena a amanecer";
  revisedGate.proposed_decision = "Cambiar la escena a amanecer";
  revisedGate.status = "approved";
  revisedGate.human_decision = {
    action: "approve",
    notes: "Respetar la disponibilidad de la localización"
  };
  let reviseCalls = 0;
  const server = createApiServer({
    generateBlueprint: async () => {
      throw new Error("Generation service must not be called");
    },
    reviseBlueprint: async () => {
      reviseCalls += 1;
      return structuredClone(revisedBlueprint);
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  assert(address && typeof address === "object");

  try {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/blueprint/revise`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          blueprint: originalBlueprint,
          decision: {
            conflict_id: "conflict_01",
            selected_option: "Cambiar la escena a amanecer",
            comment: "Respetar la disponibilidad de la localización"
          }
        })
      }
    );
    const result = (await response.json()) as {
      blueprint: unknown;
      changes: unknown[];
    };

    assert.equal(response.status, 200);
    assert.equal(reviseCalls, 1);
    assert.equal(Array.isArray(result.changes), true);
    assert.deepEqual(result.changes, [
      { element_type: "scene", element_id: "scene_01", change_type: "modified" },
      { element_type: "conflict", element_id: "conflict_01", change_type: "modified" },
      { element_type: "approval_gate", element_id: "approval_01", change_type: "modified" }
    ]);
    assert.equal(
      validateBlueprint(result.blueprint),
      true,
      ajv.errorsText(validateBlueprint.errors)
    );
  } finally {
    server.close();
    await once(server, "close");
  }
});

type Blueprint = ReturnType<typeof createValidBlueprint>;

const revisionDecision = {
  conflict_id: "conflict_01",
  selected_option: "Cambiar la escena a amanecer",
  comment: "Respetar la disponibilidad de la localización"
};

function createResolvedBlueprint(): Blueprint {
  const blueprint = createValidBlueprint();
  const conflict = blueprint.conflicts[0] as typeof blueprint.conflicts[0] & {
    resolution_notes?: string;
  };
  const gate = blueprint.approval_gates[0] as typeof blueprint.approval_gates[0] & {
    human_decision?: { action: string; notes: string };
  };
  conflict.decision_required = false;
  conflict.resolution_notes = "La escena se resolverá sin reflejar horizontalmente los planos.";
  gate.proposed_decision = revisionDecision.selected_option;
  gate.status = "approved";
  gate.human_decision = {
    action: "approve",
    notes: revisionDecision.comment
  };
  return blueprint;
}

async function requestMockedRevision(
  revisedBlueprint: Blueprint
): Promise<{ status: number; body: Record<string, unknown> }> {
  const originalBlueprint = createValidBlueprint();
  const server = createApiServer({
    generateBlueprint: async () => {
      throw new Error("Generation service must not be called");
    },
    reviseBlueprint: async () => structuredClone(revisedBlueprint)
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  assert(address && typeof address === "object");

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/blueprint/revise`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ blueprint: originalBlueprint, decision: revisionDecision })
    });
    return {
      status: response.status,
      body: (await response.json()) as Record<string, unknown>
    };
  } finally {
    server.close();
    await once(server, "close");
  }
}

async function assertInvalidRevision(
  revisedBlueprint: Blueprint,
  message: string,
  error = "INVALID_MODEL_OUTPUT"
): Promise<void> {
  const result = await requestMockedRevision(revisedBlueprint);
  assert.equal(result.status, 502);
  assert.deepEqual(result.body, { error, message });
}

test("revise rejects a byte-identical Blueprint", async () => {
  await assertInvalidRevision(
    createValidBlueprint(),
    "El Blueprint revisado es idéntico al original"
  );
});

test("revise rejects decision_required true", async () => {
  const revised = createResolvedBlueprint();
  revised.conflicts[0].decision_required = true;
  await assertInvalidRevision(
    revised,
    "El conflicto seleccionado sigue requiriendo decisión humana"
  );
});

test("revise rejects empty resolution notes", async () => {
  const revised = createResolvedBlueprint();
  const conflict = revised.conflicts[0] as typeof revised.conflicts[0] & {
    resolution_notes?: string;
  };
  conflict.resolution_notes = "   ";
  await assertInvalidRevision(revised, "La resolución del conflicto está vacía");
});

test("revise rejects a pending approval gate", async () => {
  const revised = createResolvedBlueprint();
  revised.approval_gates[0].status = "pending";
  await assertInvalidRevision(revised, "El approval gate relacionado no está aprobado");
});

test("revise rejects a missing human decision", async () => {
  const revised = createResolvedBlueprint();
  const gate = revised.approval_gates[0] as typeof revised.approval_gates[0] & {
    human_decision?: { action: string; notes: string };
  };
  delete gate.human_decision;
  await assertInvalidRevision(
    revised,
    "La salida del modelo no cumple el schema",
    "SCHEMA_VALIDATION_ERROR"
  );
});

test("revise rejects an empty changes array", async () => {
  const originalAlreadyResolved = createResolvedBlueprint();
  originalAlreadyResolved.next_steps.push({
    step_id: "step_02",
    action: "Actualizar el plan de rodaje",
    production_area: "production",
    status: "pending",
    approval_gate_id: "approval_01"
  });
  const reorderedBlueprint = structuredClone(originalAlreadyResolved);
  reorderedBlueprint.next_steps.reverse();
  const server = createApiServer({
    generateBlueprint: async () => {
      throw new Error("Generation service must not be called");
    },
    reviseBlueprint: async () => structuredClone(reorderedBlueprint)
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address === "object");

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/blueprint/revise`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ blueprint: originalAlreadyResolved, decision: revisionDecision })
    });
    const body = await response.json();
    assert.equal(response.status, 502);
    assert.deepEqual(body, {
      error: "INVALID_MODEL_OUTPUT",
      message: "La revisión no produjo cambios"
    });
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("revise preserves a schema-valid candidate before postcondition rejection", async () => {
  const originalBlueprint = createValidBlueprint();
  const revisedBlueprint = createResolvedBlueprint();
  revisedBlueprint.approval_gates[0].status = "pending";
  let preserved: Record<string, unknown> | undefined;
  const server = createApiServer({
    generateBlueprint: async () => {
      throw new Error("Generation service must not be called");
    },
    reviseBlueprint: async () => structuredClone(revisedBlueprint),
    preserveRevisedBlueprintCandidate: async (blueprint) => {
      preserved = structuredClone(blueprint);
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address === "object");

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/blueprint/revise`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ blueprint: originalBlueprint, decision: revisionDecision })
    });
    assert.equal(response.status, 502);
    assert.deepEqual(preserved, revisedBlueprint);
  } finally {
    server.close();
    await once(server, "close");
  }
});
