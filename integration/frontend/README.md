# Workflow Finder Audiovisual frontend

Integrated frontend for Backend v0.1.

## Requirements

- Node.js 22.12 or later
- Backend running at `http://127.0.0.1:3000`

## Install and run

From `integration/frontend/`:

```powershell
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`.

Vite proxies `/api` to `http://127.0.0.1:3000`. The frontend uses the real backend integration by default; it contains no local model responses or authored production outcomes.

## Commands

- `npm run dev` — local development server
- `npm test` — automated contract and service tests
- `npm run build` — production build
- `npm run preview` — preview the compiled frontend
- `npm run lint` — static lint checks

## Product flow

Creative Brief → Processing → Blueprint → Conflicts and Dependencies → Human Decision → Revised Blueprint and Changes.

The frontend keeps the current Blueprint in memory and sends it with the selected human decision to `/api/blueprint/revise`. State is lost on refresh because Backend v0.1 is stateless and has no database or authentication.

## API integration

- `GET /api/health`
- `POST /api/blueprint/generate`
- `POST /api/blueprint/revise`

Blueprint responses are validated against the frozen schema copy in `src/contracts/blueprint.schema.json`. Backend error codes are mapped to user-facing messages without exposing raw provider details.

## Source

Production source is under `src/`. Schema-valid sample data used by automated tests is isolated under `tests/fixtures/` and is never bundled or displayed by the application.

The visual atmosphere uses original procedural CSS, canvas, and inline SVG with system fonts. No downloaded images, icons, fonts, stock assets, credentials, environment files, or external runtime assets are required by the frontend.
