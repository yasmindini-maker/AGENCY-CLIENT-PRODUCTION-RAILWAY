# Agency Client Portal

A multi-tenant agency workspace for client projects, milestones, tasks, deliverables, invoices, notifications, and activity.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/agency-client-portal` — React/Vite application and route-aware dashboard UI
- `artifacts/api-server` — Express API routes and demo seed initialization
- `lib/api-spec/openapi.yaml` — source of truth for API contracts and generated hooks
- `lib/db/src/schema/portal.ts` — Drizzle tables for agency portal data
- `artifacts/agency-client-portal/src/index.css` — portal theme tokens and global styles

## Architecture decisions

- OpenAPI is the contract source; generated React Query hooks are used by the web app.
- The first build uses the managed PostgreSQL database through Drizzle and seeds a realistic Northstar Studio workspace on an empty database.
- Calendar-only fields use PostgreSQL `date` columns; timestamps use timezone-aware timestamp columns.
- The current preview is agency-facing and seeded for demo use; production auth and tenant scoping are follow-up work.

## Product

The portal gives a small creative agency one source of truth for active client projects. The dashboard surfaces work in motion, due work, outstanding invoices, notifications, and recent activity. Projects include roadmap milestones, tasks, deliverables, invoices, and a project activity trail. Clients, cross-project tasks, billing, and white-label settings have dedicated screens.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The API seed routine is intentionally idempotent so a partially completed first seed can recover on restart.
- The API is mounted under `/api`; the web app uses generated relative API URLs through the shared proxy.
- Regenerate client and Zod helpers after changing `lib/api-spec/openapi.yaml`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
