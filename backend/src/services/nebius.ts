import { config } from "dotenv";

import blueprintSchema from "../schemas/blueprint.schema.json" with { type: "json" };
import nebiusResponseFormat from "../schemas/nebius-response-format.json" with { type: "json" };

config({ quiet: true });

const MODEL_TIMEOUT_MS = 60_000;

export type GenerateBlueprintInput = {
  brief: string;
  duration: string | null;
  deadline: string | null;
  available_tools: string[];
  expected_deliverable: string | null;
};

export type HumanDecision = {
  conflict_id: string;
  selected_option: string;
  comment: string;
};

export type ModelErrorCode = "INVALID_MODEL_OUTPUT" | "MODEL_ERROR" | "MODEL_TIMEOUT";

export class ModelServiceError extends Error {
  constructor(public readonly code: ModelErrorCode, message: string) {
    super(message);
    this.name = "ModelServiceError";
  }
}

type ChatCompletionResponse = {
  usage?: unknown;
  choices?: Array<{
    finish_reason?: unknown;
    message?: {
      content?: unknown;
    };
  }>;
};

function getRequiredEnvironment(): {
  apiKey: string;
  baseUrl: string;
  model: string;
} {
  const apiKey = process.env.NEBIUS_API_KEY;
  const baseUrl = process.env.NEBIUS_BASE_URL;
  const model = process.env.NEBIUS_MODEL;

  if (!apiKey || !baseUrl || !model) {
    throw new ModelServiceError(
      "MODEL_ERROR",
      "La configuración de Nebius está incompleta"
    );
  }

  return { apiKey, baseUrl, model };
}

function buildEndpoint(baseUrl: string): URL {
  return new URL("/v1/chat/completions", baseUrl);
}

function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function utcOffset(date: Date): string {
  const minutes = -date.getTimezoneOffset();
  const sign = minutes >= 0 ? "+" : "-";
  const hours = String(Math.floor(Math.abs(minutes) / 60)).padStart(2, "0");
  const remainder = String(Math.abs(minutes) % 60).padStart(2, "0");
  return `UTC${sign}${hours}:${remainder}`;
}

export function buildGenerateSystemPrompt(
  now: Date = new Date(),
  timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone || "local"
): string {
  return [
    "Eres un asistente especializado exclusivamente en preproducción audiovisual.",
    "Convierte el brief recibido en un Preproduction Blueprint práctico.",
    `Current date: ${localIsoDate(now)}`,
    `Current timezone: ${timezone} (${utcOffset(now)})`,
    "Treat the provided current date as the authoritative temporal reference.",
    "Never generate due dates earlier than the current date unless the user explicitly requests historical dates.",
    'If the user supplies a relative deadline such as "3 days", calculate production dates forward from the current date.',
    "Keep all production task dates internally consistent with that deadline.",
    "Do not invent unrelated historical dates.",
    "Responde únicamente con un objeto JSON, sin Markdown ni texto adicional.",
    "El JSON debe cumplir exactamente el JSON Schema proporcionado.",
    "No añadas propiedades que no estén definidas en el schema.",
    "Return only the object required by the supplied JSON Schema.",
    "Do not use Markdown.",
    "Do not use code fences.",
    "Do not add commentary before or after the object.",
    `JSON Schema: ${JSON.stringify(blueprintSchema)}`
  ].join("\n");
}

export function buildGenerateMessages(
  input: GenerateBlueprintInput,
  now: Date = new Date(),
  timezone?: string
): Array<{ role: "system" | "user"; content: string }> {
  return [
    { role: "system", content: buildGenerateSystemPrompt(now, timezone) },
    { role: "user", content: JSON.stringify(input) }
  ];
}

export async function generateBlueprintWithNebius(
  input: GenerateBlueprintInput
): Promise<unknown> {
  const { apiKey, baseUrl, model } = getRequiredEnvironment();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

  try {
    const response = await fetch(buildEndpoint(baseUrl), {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        max_completion_tokens: 32768,
        reasoning_effort: "minimal",
        messages: buildGenerateMessages(input),
        response_format: nebiusResponseFormat
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new ModelServiceError(
        "MODEL_ERROR",
        `Nebius respondió con status HTTP ${response.status}`
      );
    }

    const completion = (await response.json()) as ChatCompletionResponse;
    const choice = completion.choices?.[0];
    const content = choice?.message?.content;
    const diagnostics = {
      status_http: response.status,
      request_id:
        response.headers.get("x-request-id") ??
        response.headers.get("request-id") ??
        response.headers.get("x-trace-id") ??
        response.headers.get("trace-id"),
      finish_reason:
        typeof choice?.finish_reason === "string" ? choice.finish_reason : null,
      content_type: Array.isArray(content) ? "array" : typeof content,
      content_empty: typeof content === "string" ? content.trim().length === 0 : content == null,
      content_length: typeof content === "string" ? content.length : null,
      usage: completion.usage ?? null
    };

    if (typeof content !== "string" || content.trim().length === 0) {
      console.info("Nebius completion diagnostics", {
        ...diagnostics,
        parse_error: "El contenido no es un string JSON no vacío"
      });
      throw new ModelServiceError(
        "INVALID_MODEL_OUTPUT",
        "El modelo no devolvió contenido JSON"
      );
    }

    try {
      const parsedContent: unknown = JSON.parse(content);
      console.info("Nebius completion diagnostics", {
        ...diagnostics,
        parse_error: null
      });
      return parsedContent;
    } catch {
      console.info("Nebius completion diagnostics", {
        ...diagnostics,
        parse_error: "SyntaxError: contenido JSON no parseable"
      });
      throw new ModelServiceError(
        "INVALID_MODEL_OUTPUT",
        "La salida del modelo no es JSON válido"
      );
    }
  } catch (error) {
    if (error instanceof ModelServiceError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new ModelServiceError("MODEL_TIMEOUT", "La inferencia excedió el tiempo límite");
    }
    throw new ModelServiceError("MODEL_ERROR", "No se pudo completar la inferencia");
  } finally {
    clearTimeout(timeout);
  }
}

export async function reviseBlueprintWithNebius(
  blueprint: unknown,
  decision: HumanDecision
): Promise<unknown> {
  const { apiKey, baseUrl, model } = getRequiredEnvironment();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

  try {
    const response = await fetch(buildEndpoint(baseUrl), {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        max_completion_tokens: 32768,
        reasoning_effort: "minimal",
        messages: [
          {
            role: "system",
            content: [
              "Eres un asistente especializado exclusivamente en revisión de preproducción audiovisual.",
              "La decisión humana suministrada es la autoridad final y debe respetarse.",
              "Revisa el Blueprint existente modificando solo las partes audiovisuales afectadas cuando sea posible.",
              "Mantén la coherencia entre escenas, planos, personajes, localizaciones, dependencias, conflictos, approval gates y próximos pasos.",
              "Para el conflicto indicado por la decisión humana, conserva el conflicto, establece decision_required en false y registra la opción humana exacta en resolution_notes.",
              "En su approval gate relacionado, establece status en approved, proposed_decision en la opción humana exacta y human_decision.action en approve.",
              "Si el comentario humano no está vacío, cópialo exactamente en human_decision.notes. No inventes decided_by ni decided_at.",
              "El Blueprint revisado debe diferir del original y reflejar la decisión solo en los elementos audiovisuales afectados.",
              "Devuelve el Blueprint completo revisado; no devuelvas un diff ni una explicación.",
              "Return only the object required by the supplied JSON Schema.",
              "Do not use Markdown.",
              "Do not use code fences.",
              "Do not add commentary before or after the object.",
              `JSON Schema: ${JSON.stringify(blueprintSchema)}`
            ].join("\n")
          },
          {
            role: "user",
            content: JSON.stringify({ blueprint, decision })
          }
        ],
        response_format: nebiusResponseFormat
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new ModelServiceError(
        "MODEL_ERROR",
        `Nebius respondió con status HTTP ${response.status}`
      );
    }

    const completion = (await response.json()) as ChatCompletionResponse;
    const choice = completion.choices?.[0];
    const content = choice?.message?.content;
    const diagnostics = {
      status_http: response.status,
      request_id:
        response.headers.get("x-request-id") ??
        response.headers.get("request-id") ??
        response.headers.get("x-trace-id") ??
        response.headers.get("trace-id"),
      finish_reason:
        typeof choice?.finish_reason === "string" ? choice.finish_reason : null,
      content_type: Array.isArray(content) ? "array" : typeof content,
      content_empty: typeof content === "string" ? content.trim().length === 0 : content == null,
      content_length: typeof content === "string" ? content.length : null,
      usage: completion.usage ?? null
    };

    if (typeof content !== "string" || content.trim().length === 0) {
      console.info("Nebius revision diagnostics", {
        ...diagnostics,
        parse_error: "El contenido no es un string JSON no vacío"
      });
      throw new ModelServiceError(
        "INVALID_MODEL_OUTPUT",
        "El modelo no devolvió contenido JSON"
      );
    }

    try {
      const parsedContent: unknown = JSON.parse(content);
      console.info("Nebius revision diagnostics", {
        ...diagnostics,
        parse_error: null
      });
      return parsedContent;
    } catch {
      console.info("Nebius revision diagnostics", {
        ...diagnostics,
        parse_error: "SyntaxError: contenido JSON no parseable"
      });
      throw new ModelServiceError(
        "INVALID_MODEL_OUTPUT",
        "La salida del modelo no es JSON válido"
      );
    }
  } catch (error) {
    if (error instanceof ModelServiceError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new ModelServiceError("MODEL_TIMEOUT", "La inferencia excedió el tiempo límite");
    }
    throw new ModelServiceError("MODEL_ERROR", "No se pudo completar la inferencia");
  } finally {
    clearTimeout(timeout);
  }
}
