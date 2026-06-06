# FleetOps SADC

Cross-border road-freight operations platform for SADC carriers — manage fleet, drivers, loads, trips, compliance docs, fuel purchases, disbursements, FX rates, and border charges from a single dark ops-centre UI.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, `/api`)
- `pnpm --filter @workspace/fleetops run dev` — run the React frontend (port set via `PORT`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8080, path `/api`)
- DB: PostgreSQL + Drizzle ORM
- Auth: Replit Auth (OpenID Connect) — `@workspace/replit-auth-web` on client
- Frontend: React + Vite + Tailwind CSS PWA — dark ops-centre theme, cyan/lime/amber/red accents, Sora/Hanken Grotesk/JetBrains Mono fonts
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec) → `lib/api-client-react` (hooks) + `lib/api-zod` (schemas)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/routes/` — all API route modules
- `artifacts/fleetops/src/pages/` — 12 module pages (dashboard, fleet, drivers, loads, trips, compliance, disbursements, fuel, fx-rates, border-catalog, settings)
- `artifacts/fleetops/src/components/layout.tsx` — sidebar + app shell
- `lib/api-client-react/src/generated/api.schemas.ts` — **source of truth** for all API types
- `lib/api-client-react/src/generated/api.ts` — generated hooks (check mutation var shapes here)
- `lib/db/src/schema/fleet.ts` — DB schema
- `lib/api-spec/` — OpenAPI spec (run codegen after changes)

## Architecture decisions

- Contract-first: OpenAPI spec → Orval codegen → typed hooks + Zod schemas consumed in both client and server.
- All mutations use Orval-generated variable shapes: e.g. `deleteTruck({truckId})`, `deleteComplianceDoc({docId})`, `createDisbursement({tripId, data})`.
- `useListDisbursements(tripId: string)` takes a plain string, not an object — disbursements are scoped to a trip.
- `ListTripsParams` and `ListLoadsParams` have no `limit` field — pagination is not yet exposed via query params.
- FxRate stores a single `currency` with `rateToBase` (to USD) and `asOf` date — no from/to pair.

## Product

FleetOps SADC gives SADC road-freight carriers:
- **Dashboard** — live KPIs: active trucks, loads en route, fleet utilisation, A/R outstanding, compliance alerts
- **Fleet** — register trucks (fleetNo, regNo, vehicleType, GVM class), track status
- **Drivers** — manage driver records with passport/nationality data
- **Loads** — create consignments, assign to trucks, track through delivered → invoiced → paid lifecycle
- **Trips** — group loads into trips, advance status (draft → planned → active → completed), set advance amounts
- **Compliance Vault** — track permits, licences, certificates per truck/driver with expiry alerts
- **Cash Loop** — record trip disbursements (tolls, border fees, advances) per trip
- **Fuel** — cross-border fuel purchase log with litres, price/litre, country
- **FX Rates** — manual rate management for SADC currencies (rate-to-base USD)
- **Border Catalog** — reference data for border post charges by country/type
- **Settings** — org management, member list, demo data seeding

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change before editing frontend pages.
- Always check `lib/api-client-react/src/generated/api.schemas.ts` for actual field names before coding — many types differ from intuitive names (e.g. `fleetNo` not `fleetNumber`, `rateToBase` not `rate`, `expiryDate` not `expiresAt`).
- Check `lib/api-client-react/src/generated/api.ts` for exact mutation variable shapes (destructuring in `MutationFunction` body).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
