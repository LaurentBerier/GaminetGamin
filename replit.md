# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Gaminet Gamin GG (`artifacts/gaminet-gamin`)

- **Type**: react-vite
- **Preview path**: `/`
- **Description**: Trilingual (FR/EN/ES) Québec clothing brand boutique site
- **Features**:
  - Trilingual support: French (default/québécois), English, Spanish
  - Language detection from URL path and browser settings
  - Language persistence via localStorage
  - Localized routes: `/fr/boutique`, `/en/shop`, `/es/tienda`
  - Language switcher in header with smart route translation
  - Product catalog with 15 products from `src/data/produits.json`
  - Each product has multilingual `nom`, `description`, and `artiste.bio`
  - Translation files: `src/locales/fr.json`, `src/locales/en.json`, `src/locales/es.json`
  - Pages: Home, Shop (with category filter), Product detail, About, Artists, Contact
  - Brand colors: gold (`#C8914A`) and green (`#4A7A5E`)
  - Font: Nunito (Google Fonts)
