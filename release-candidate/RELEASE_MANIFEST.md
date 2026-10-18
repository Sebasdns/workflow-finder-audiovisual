# Workflow Finder Audiovisual — Release Manifest

## Release

- Version: `v0.1`
- Status: release candidate, technically ready for public repository preparation
- Prepared: 2026-10-18 (Europe/Madrid)
- License: Mozilla Public License 2.0 (`MPL-2.0`)

## Verified status

| Area | Result |
| --- | --- |
| Backend typecheck | PASS |
| Backend tests | PASS — 17/17 |
| Backend build | PASS |
| Frontend tests | PASS — 11/11 |
| Frontend build | PASS |
| Real E2E generate | PASS |
| Real E2E revise | PASS |
| English/Spanish interface | PASS |
| Output validation against the frozen schema | PASS |

The frozen Blueprint schema SHA-256 is
`3BBE3EADB9808967046BA87EC3DA273CB612E479D88490657FE5D7CD3875F476`.

## Runtime

- Model: NVIDIA Nemotron 3 Super 120B
- Model ID: `nvidia/nemotron-3-super-120b-a12b`
- Inference provider: Nebius Token Factory
- API style: OpenAI-compatible Chat Completions

## Public artifacts included

The public repository contains:

- public `README.md`, `.gitignore`, and `LICENSE`;
- backend source, tests, TypeScript configuration, package metadata, and empty `.env.example` values;
- integrated frontend source, tests, configuration, and package metadata;
- frozen backend schema and matching frontend contract;
- no example payload in v0.1; future examples require redistribution review before inclusion.

## Internal or generated artifacts excluded

- `backend/.env` and all credentials;
- internal handoff, provider diagnostics, and E2E evidence;
- incoming delivery material;
- previous release candidates and delivery copies;
- `node_modules/`, `dist/`, logs, temporary files, backups, and diagnostic scripts;
- private or internal proprietary material.

## Known limitations

- The `finish_reason` from the last frontend-driven generate request was not retained, although the request returned HTTP 200 and a Blueprint valid against the frozen schema.
- The application is stateless: it has no database, user authentication, or persistent project storage.
- Real generation and revision require network access and valid Nebius environment variables.
- Model-generated content can vary; conflicts appear only when detected in the generated Blueprint.

No repository was published and no remote push was performed during this freeze.
