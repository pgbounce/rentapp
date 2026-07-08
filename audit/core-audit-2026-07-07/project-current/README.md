# TopRent beta

Foundation core projektu:

- `apps/web` - publiczna strona
- `apps/api` - headless backend
- `apps/worker` - zadania w tle
- `packages/config` - wspolna konfiguracja
- `packages/contracts` - wspolne kontrakty
- `packages/db` - warstwa bazy danych
- `packages/redis` - wspolne polaczenie z Redisem

## Start

1. `pnpm install`
2. `pnpm infra:up`
3. `pnpm db:provision`
4. `pnpm db:migrate`
5. `pnpm dev`

## Jakosc

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm check`

Test smoke API wymaga uruchomionych `postgres` i `redis`.

## Adresy lokalne

- `web`: `http://localhost:3000`
- `api`: `http://localhost:3001/api/v1/health`
