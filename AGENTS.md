# AGENTS.md

This file is the working agreement for agentic coding assistants in this repo.

## Project Snapshot

- Stack: Next.js App Router (`next@16.1.1`), React (`react@19.2.3`), TypeScript (`typescript@^5.8.3`), Tailwind CSS v4, Prisma + Postgres, Better Auth.
- Package manager/runtime: `bun` (lockfile: `bun.lockb`).
- Path alias: `@/*` maps to `src/*` (see `tsconfig.json`).
- Prisma Client output: `src/generated/prisma` (generated; do not edit by hand).

## Commands

### Install

- Install deps: `bun install`
- Post-install: `prisma generate` runs via `postinstall` in `package.json`.

### Dev / Build / Start

- Dev server (Turbopack): `bun dev`
- Production build: `bun run build`
- Start production server: `bun start`

### Lint

There is no `lint` script in `package.json`. Use Next’s linter:

- Lint all: `bunx next lint`

### Typecheck

- Typecheck all (no emit): `bunx tsc -p tsconfig.json --noEmit`

### Format (Prettier)

- Check formatting: `bunx prettier --check .`
- Auto-format: `bunx prettier -w .`
  Notes: `tabWidth: 4`, `printWidth: 160`, imports sorted, Tailwind classes sorted, Tailwind merge helpers: `cx`, `sortCx`.

### Tests

No `*.test.*` / `*.spec.*` files or test runner config were found.
If/when tests exist, prefer Bun:

- Run all: `bun test`
- Run single file: `bun test path/to/file.test.ts`
- Run by name/pattern: `bun test -t "pattern"`

## Editor/Agent Rules (Cursor/Copilot)

- Cursor: no `.cursor/rules/` and no `.cursorrules` file found.
- Copilot: no `.github/copilot-instructions.md` found.
  If these appear later, mirror their key constraints here.

## Code Style & Conventions

### General

- Prefer minimal, functional solutions; avoid drive-by refactors.
- If a flow needs >~3 validations, propose options before building a “validation wall”.

### Naming

- Files/folders: `kebab-case` (domain terms may be Spanish; match nearby code).
- React components: `PascalCase`.
- Variables/functions: `camelCase`.
- Constants: `SCREAMING_SNAKE_CASE`.
  Only rename files when the task requires it.

### Imports

Prettier enforces import ordering (see `.prettierrc`):

1. `react`, `react-dom` 2) third-party 3) `@/…` 4) relative `./`/`../`
   Guidelines:

- Prefer `import type { … } from "…"` for type-only imports.
- Prefer `@/…` over deep relative imports from `src/`.

### Formatting

- Let Prettier format; don’t hand-align large blocks.
- Keep indentation at 4 spaces.
- Don’t fight Tailwind class ordering; Prettier will sort it.

### TypeScript

- `strict: true`; avoid `any` in new code.
- Prefer `unknown` + narrowing.
- Keep types explicit at module boundaries (API routes, `src/lib/*`).
- Use `as const` / unions when they make invariants obvious.

### Next.js / React

- App Router API routes live under `src/app/api/**/route.ts`.
- Keep secrets/DB access server-only (API routes or server-only modules).
- Use client components only when needed (`"use client"`).

### Tailwind / UI

- Prefer the Untitled UI components under `src/components/`.
- Use `cx` / `sortCx` for class merging.

## API Route Patterns

### Auth & Authorization

Prefer wrapping handlers using `src/lib/api-auth.ts`:

- `withAuth` for authenticated routes
- `withAdminOnly` for admin-only routes
- `withRoles([...])` for role-based routes

### Error Handling

- For try/catch based routes, return `handleAPIError(error)` from `src/lib/api-errors.ts`.
- For inline validation, return `NextResponse.json({ error: "…", message: "…" }, { status })` (match nearby patterns).
  Guidelines: don’t leak secrets; log with context (e.g. `"GET /api/stock error:"`); format unknown errors safely.

### Input Validation

- Validate required inputs close to the boundary; normalize (`trim`, case/diacritics) when relevant.
- Prefer small helpers for repeated normalization.

## Data / Prisma

- Import Prisma client from `src/lib/prisma.ts` (singleton pattern).
- Do not edit `src/generated/prisma/`.
- Schema uses multiple Postgres schemas (see `prisma/schema.prisma`).
  Guidelines: avoid schema changes unless asked; prefer `select` over wide `include`; serialize dates to ISO strings before returning JSON.

## Environment Variables / Secrets

- Expected local env file: `.env.local` (see `CLAUDE.md` for required vars).
- Never commit secrets (`.env*`, tokens, service account keys).

## Notes

- Domain context and operational constraints: `CLAUDE.md`.
- Component sync automation: `.github/workflows/README.md`.
