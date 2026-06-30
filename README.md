# TopRent beta

Foundation core projektu:

- `apps/web` - publiczna strona
- `apps/api` - headless backend
- `apps/worker` - zadania w tle
- `packages/config` - wspolna konfiguracja
- `packages/contracts` - wspolne kontrakty
- `packages/db` - warstwa bazy danych

## Start

1. `pnpm install`
2. `pnpm infra:up`
3. `pnpm dev`

## Adresy lokalne

- `web`: `http://localhost:3000`
- `api`: `http://localhost:3001/api/v1/health`
