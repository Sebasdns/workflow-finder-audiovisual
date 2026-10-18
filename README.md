# Workflow Finder audiovisual

Workflow Finder Audiovisual convierte un brief creativo en un Blueprint de
preproducción estructurado, identifica dependencias y conflictos audiovisuales y
mantiene la decisión final en manos del equipo humano.

El MVP resuelve el salto entre una intención creativa y un plan accionable de
preproducción. Su flujo validado es:

```text
Brief → Blueprint → Conflict → Human Decision → Revised Blueprint
```

## STACK

- Backend: Node.js, TypeScript, AJV y API HTTP stateless.
- Frontend: JavaScript, Vite, CSS y validación AJV en cliente.
- Modelo: NVIDIA Nemotron 3 Super 120B
  (`nvidia/nemotron-3-super-120b-a12b`).
- Runtime de inferencia: Nebius Token Factory, mediante su API compatible con
  OpenAI Chat Completions.
- Structured output: response format compatible de Nebius, seguido siempre de
  validación contra el schema audiovisual completo y congelado.

## ARCHITECTURE

```text
Frontend (Vite, :5173)
        │ /api proxy
        ▼
Backend stateless (Node.js, :3000)
        │
        ├─ AJV + blueprint.schema.json
        └─ Nebius Token Factory → NVIDIA Nemotron 3 Super 120B
```

No existe base de datos, autenticación, memoria, RAG, Tavily ni arquitectura
multi-agent. El frontend conserva temporalmente el Blueprint en memoria y lo reenvía
completo cuando el usuario solicita una revisión.

## FRONTEND SETUP

Requisito: Node.js 22.12 o posterior.

Desde la raíz del proyecto:

```powershell
cd integration/frontend
npm ci
npm run dev
```

Abrir `http://127.0.0.1:5173`. Vite mantiene el proxy `/api` hacia
`http://127.0.0.1:3000`.

Comandos de verificación:

```powershell
npm test
npm run build
```

La interfaz permite cambiar entre ES y EN. El selector traduce únicamente etiquetas
y estados controlados por el frontend; nunca modifica el contenido generado del
Blueprint.

## BACKEND SETUP

Requisito: Node.js.

Desde la raíz del proyecto:

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Configurar en `backend/.env`:

```dotenv
NEBIUS_API_KEY=
NEBIUS_BASE_URL=
NEBIUS_MODEL=
```

Comandos disponibles, ejecutados desde `backend/`:

```powershell
# Desarrollo
npm run dev

# Comprobación de tipos
npm run typecheck

# Tests
npm test

# Compilación
npm run build

# Iniciar el backend compilado
npm start
```

## API CONTRACT

Todas las entradas y salidas usan `application/json`.

### Health

- Método: `GET`
- Ruta: `/api/health`
- Input JSON: ninguno
- Output JSON: estado del backend
- Errores propios: ninguno

Ejemplo:

```http
GET /api/health
```

```json
{
  "status": "ok"
}
```

### Generate Blueprint

- Método: `POST`
- Ruta: `/api/blueprint/generate`
- Input JSON: exactamente `brief`, `duration`, `deadline`, `available_tools` y
  `expected_deliverable`; no se admiten campos adicionales.
- Output JSON: un Preproduction Blueprint que cumple
  `backend/src/schemas/blueprint.schema.json` v0.1.
- Errores posibles: `INVALID_INPUT`, `INVALID_MODEL_OUTPUT`,
  `SCHEMA_VALIDATION_ERROR`, `MODEL_ERROR`, `MODEL_TIMEOUT`.

Input exacto:

```json
{
  "brief": "string",
  "duration": "string | null",
  "deadline": "string | null",
  "available_tools": ["string"],
  "expected_deliverable": "string | null"
}
```

Ejemplo mínimo de petición:

```json
{
  "brief": "Vídeo de presentación de una cafetería artesanal",
  "duration": "30 segundos",
  "deadline": null,
  "available_tools": ["cámara", "trípode"],
  "expected_deliverable": "Vídeo horizontal de 30 segundos"
}
```

Ejemplo mínimo de respuesta válida:

```json
{
  "schema_version": "0.1",
  "objective": {
    "summary": "Presentar una cafetería artesanal",
    "deliverables": ["Vídeo horizontal de 30 segundos"]
  },
  "constraints": {
    "runtime": "30 segundos"
  },
  "character_requirements": [
    {
      "character_id": "character_01",
      "name": "Barista",
      "description": "Protagonista de la pieza"
    }
  ],
  "world_requirements": {
    "locations": [
      {
        "location_id": "location_01",
        "name": "Cafetería",
        "description": "Interior de una cafetería artesanal"
      }
    ]
  },
  "scenes": [
    {
      "scene_id": "scene_01",
      "title": "Preparación",
      "description": "La barista prepara el café",
      "location_id": "location_01",
      "character_ids": ["character_01"],
      "shots": [
        {
          "shot_id": "shot_01",
          "description": "Preparación del café",
          "shot_size": "Plano medio",
          "camera_directions": {
            "framing": "Barista centrada",
            "movement": "Cámara fija"
          },
          "character_ids": ["character_01"]
        }
      ]
    }
  ],
  "dependencies": [],
  "conflicts": [],
  "approval_gates": [],
  "next_steps": []
}
```

### Revise Blueprint

- Método: `POST`
- Ruta: `/api/blueprint/revise`
- Input JSON: exactamente `blueprint` y `decision`. `decision` contiene exactamente
  `conflict_id`, `selected_option` y `comment`.
- Output JSON: el Blueprint completo revisado y un array `changes`.
- Errores posibles: `INVALID_INPUT`, `INVALID_MODEL_OUTPUT`,
  `SCHEMA_VALIDATION_ERROR`, `MODEL_ERROR`, `MODEL_TIMEOUT`.

Input exacto:

```json
{
  "blueprint": {},
  "decision": {
    "conflict_id": "string",
    "selected_option": "string",
    "comment": "string"
  }
}
```

`blueprint` debe ser el objeto completo y válido recibido previamente desde
`/api/blueprint/generate`. `conflict_id` debe existir en su array `conflicts`.

Ejemplo mínimo de petición:

```json
{
  "blueprint": {
    "schema_version": "0.1",
    "objective": {
      "summary": "Presentar una cafetería artesanal",
      "deliverables": ["Vídeo horizontal de 30 segundos"]
    },
    "constraints": {},
    "character_requirements": [
      {
        "character_id": "character_01",
        "name": "Barista",
        "description": "Protagonista de la pieza"
      }
    ],
    "world_requirements": {
      "locations": [
        {
          "location_id": "location_01",
          "name": "Cafetería",
          "description": "Interior de una cafetería artesanal"
        }
      ]
    },
    "scenes": [
      {
        "scene_id": "scene_01",
        "title": "Preparación nocturna",
        "description": "La barista prepara el café de noche",
        "location_id": "location_01",
        "character_ids": ["character_01"],
        "time_of_day": "noche",
        "shots": [
          {
            "shot_id": "shot_01",
            "description": "Preparación del café",
            "shot_size": "Plano medio",
            "camera_directions": {
              "framing": "Barista centrada",
              "movement": "Cámara fija"
            },
            "character_ids": ["character_01"]
          }
        ]
      }
    ],
    "dependencies": [],
    "conflicts": [
      {
        "conflict_id": "conflict_01",
        "description": "La localización no está disponible de noche",
        "severity": "high",
        "affected_elements": [
          {
            "element_type": "scene",
            "element_id": "scene_01"
          }
        ],
        "decision_required": true,
        "approval_gate_id": "approval_01"
      }
    ],
    "approval_gates": [
      {
        "approval_gate_id": "approval_01",
        "description": "Decidir el horario de rodaje",
        "conflict_ids": ["conflict_01"],
        "proposed_decision": "Cambiar al amanecer",
        "status": "pending"
      }
    ],
    "next_steps": []
  },
  "decision": {
    "conflict_id": "conflict_01",
    "selected_option": "Cambiar la escena al amanecer",
    "comment": "Priorizar la disponibilidad de la localización"
  }
}
```

Ejemplo mínimo de respuesta:

```json
{
  "blueprint": {
    "schema_version": "0.1",
    "objective": {
      "summary": "Presentar una cafetería artesanal",
      "deliverables": ["Vídeo horizontal de 30 segundos"]
    },
    "constraints": {},
    "character_requirements": [],
    "world_requirements": {
      "locations": []
    },
    "scenes": [],
    "dependencies": [],
    "conflicts": [],
    "approval_gates": [],
    "next_steps": []
  },
  "changes": [
    {
      "element_type": "scene",
      "element_id": "scene_01",
      "change_type": "modified"
    }
  ]
}
```

Cada elemento de `changes` contiene:

- `element_type`: `objective`, `constraints`, `character`, `world_requirements`,
  `location`, `scene`, `shot`, `dependency`, `conflict`, `approval_gate` o
  `next_step`.
- `element_id`: identificador del elemento cuando corresponde.
- `change_type`: `added`, `removed` o `modified`.

### Error responses

Los errores usan esta forma:

```json
{
  "error": "ERROR_CODE",
  "message": "Descripción del error"
}
```

- `INVALID_INPUT` (`400`): JSON inválido, contrato incorrecto, Blueprint inválido
  o `conflict_id` inexistente.
- `INVALID_MODEL_OUTPUT` (`502`): Nemotron no devolvió contenido JSON parseable.
- `SCHEMA_VALIDATION_ERROR` (`502`): el JSON devuelto por Nemotron no cumple
  `blueprint.schema.json`.
- `MODEL_ERROR` (`502`): configuración incompleta, error de red o respuesta no
  satisfactoria de Nebius.
- `MODEL_TIMEOUT` (`504`): la inferencia superó el límite de tiempo.
- `NOT_FOUND` (`404`): ruta o combinación de método y ruta no implementada.

`INTERNAL_ERROR` no existe en backend v0.1.

## FRONTEND INTEGRATION NOTES

- Base URL local: `http://127.0.0.1:3000`.
- Health: `GET /api/health`.
- Generación: `POST /api/blueprint/generate`.
- Revisión humana: `POST /api/blueprint/revise`.
- El frontend debe conservar temporalmente en su propio estado el Blueprint recibido
  y reenviarlo completo a `/api/blueprint/revise` junto con la decisión humana.
- No existe base de datos ni autenticación.
- El backend es stateless: no conserva Blueprints entre peticiones.
- Los estados de loading y error del frontend deben mapear los códigos
  `INVALID_INPUT`, `INVALID_MODEL_OUTPUT`, `SCHEMA_VALIDATION_ERROR`, `MODEL_ERROR`
  y `MODEL_TIMEOUT`.
- Backend v0.1 no añade cabeceras CORS. Durante el desarrollo, si frontend y backend
  usan orígenes distintos, el frontend debe utilizar un proxy local hacia esta API.

## DEMO / VERIFIED EXAMPLE

Con backend y frontend activos, se puede probar el flujo de generación desde el
formulario con este ejemplo validado:

```text
Creative Brief: Create a 30-second cinematic sequence featuring a snow leopard
overlooking a futuristic mountain city, followed by a waterfront drinking scene.
Maintain consistent character laterality and visual continuity across all shots.
Duration: 30 seconds
Deadline: 3 days
Available tools: Blender, After Effects, DaVinci Resolve
Expected deliverable: Production-ready audiovisual blueprint
```

El resultado real validado incluyó un Blueprint conforme al schema y fechas de
producción calculadas hacia adelante desde la fecha de ejecución. La revisión humana
requiere un Blueprint que contenga un conflicto real con `conflict_id`; el frontend
no inventa conflictos.

## LICENSE

Este proyecto se distribuye bajo la Mozilla Public License 2.0.

SPDX-License-Identifier: `MPL-2.0`

Consulta el texto oficial íntegro en [LICENSE](LICENSE).
