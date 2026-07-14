# Operations Reference

## Environment configuration

Configuration is split into:

- `packages/config/src/base.ts`
- `packages/config/src/api.ts`
- `packages/config/src/worker.ts`

### Environment variables

| Variable | Used by | Dev/test default | Production behavior if missing |
| --- | --- | --- | --- |
| `NODE_ENV` | API, worker, shared config | `development` | default remains in place |
| `DATABASE_URL` | API runtime, worker runtime | `postgresql://toprent_app:toprent_app@localhost:5432/toprent` | startup fails |
| `DATABASE_ADMIN_URL` | provision and migrate scripts | `postgresql://postgres:postgres@localhost:5432/toprent` | script fails |
| `REDIS_URL` | API and worker runtime | `redis://localhost:6379` | startup fails |
| `CORS_ALLOWED_ORIGINS` | API only | `http://localhost:3000` | startup fails |
| `API_PORT` | API only | `3001` | default remains in place |
| `API_PREFIX` | API only | `api/v1` | default remains in place |
| `WORKER_NAME` | worker only | `toprent-worker` | default remains in place |

### Runtime notes

- API normalizes CORS origins
- requests without `Origin` are allowed
- Fastify runs with `trustProxy: false`

## Two database roles

### `admin`

Used by:

- `pnpm db:provision`
- `pnpm db:migrate`
- admin-side smoke seeding in write-path tests

This role must already exist and must be able to bypass RLS:

- `SUPERUSER`, or
- `BYPASSRLS`

Why:

- migrations create `SECURITY DEFINER` functions
- those functions must read tables protected by `FORCE ROW LEVEL SECURITY`
- that happens before request session scope exists

The scripts now fail early if `DATABASE_ADMIN_URL` uses a role that cannot do this.

### `app`

This is the restricted runtime role created by `provision.mjs`.

Important flags:

- `NOSUPERUSER`
- `NOCREATEDB`
- `NOCREATEROLE`
- `NOINHERIT`
- `NOREPLICATION`
- `NOBYPASSRLS`

Also:

- `row_security = on`
- `CONNECT` granted on database

If runtime connected as admin instead of app, the security model would lose its meaning.

## Provisioning and migrations

### Zero-to-ready order

1. start PostgreSQL
2. set `DATABASE_ADMIN_URL`
3. set `DATABASE_URL`
4. run `pnpm db:provision`
5. run `pnpm db:migrate`

### What `pnpm db:provision` does

- reads admin and runtime connection strings
- verifies that the connected admin role has `SUPERUSER` or `BYPASSRLS`
- extracts runtime role name, password, and database name
- creates or updates the runtime role
- sets safe role flags
- enables `row_security`
- grants database connect access

### What `pnpm db:migrate` does

- connects through admin URL
- verifies that the connected admin role has `SUPERUSER` or `BYPASSRLS`
- checks that runtime role exists
- ensures `app_migrations` exists
- reads SQL migrations in order
- replaces `{{app_role}}` with the real runtime role
- runs each migration in its own transaction
- records applied migration names

### Why `{{app_role}}` exists

The SQL files do not hardcode one application role name. The migrate script injects the real name per environment.

### Why `app_migrations` exists

It is the migration journal:

- which migration ran
- when it ran

## Redis

`packages/redis/src/client.ts` currently provides a small Redis connection factory based on `ioredis`.

Current API behavior:

- logs Redis connection errors
- connects lazily
- checks readiness through `ping()`
- closes on shutdown

## Worker

The worker is currently only infrastructure foundation.

It:

1. reads `REDIS_URL`
2. opens Redis
3. performs `ping()`
4. logs readiness
5. waits for shutdown signals
6. closes Redis

Important:

- BullMQ is in dependencies
- no real business queue is implemented yet

## CI

On push to `main` and on pull requests, CI runs:

1. checkout
2. pnpm setup
3. Node 22 setup
4. `pnpm install --frozen-lockfile`
5. `pnpm db:provision`
6. `pnpm db:migrate`
7. `pnpm lint`
8. `pnpm typecheck`
9. `pnpm test`

Services started in CI:

- `postgres:17-alpine`
- `redis:8-alpine`

### Why provision and migrate run before tests

Because the core depends on:

- restricted app role
- grants
- SQL helpers in schema `app`
- RLS policies

Without that setup, tests would not validate the real foundation.

## Test strategy

### HTTP smoke tests

Used for:

- health endpoints
- tenant resolver behavior

Why:

- validates full HTTP stack
- validates hooks, filters, routing, and response shape

### Direct service smoke tests

Used mainly for:

- write path security behavior

Why:

- isolates low-level permission flow
- does not require a finished business endpoint

## What is intentionally not built yet

- internal auth module
- customer auth module
- customer tables
- bookings
- payments
- public listing read model
- public listing RLS
- CRUD endpoints for business tables
- real BullMQ jobs
- real use of `btree_gist`
