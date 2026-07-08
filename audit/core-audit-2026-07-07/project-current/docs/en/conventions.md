# Conventions

## Core rules

- keep modules small and named by responsibility
- avoid generic folders like `helpers`, `misc`, or `shared-stuff`
- keep frontend free of business truth
- keep code compact, explicit, and easy to scan
- never confuse `tenant` with `partner`
- prefer one clear access model over tenant-specific exceptions

## Naming

- use clear nouns: `health`, `config`, `contracts`, `db`
- keep file names predictable: `health.module.ts`, `health.service.ts`
- prefer short functions over large classes with many responsibilities
- `tenant` means top-level client of the system
- `partner` means car supplier inside a tenant

## Boundaries

- `web` renders UI and calls `api`
- `api` owns business rules
- `worker` owns background execution
- shared packages must stay generic and framework-light

## Runtime rules

- request identity should exist before auth exists
- every API error should return one consistent response shape
- `live` means process is alive
- `ready` means dependencies are reachable
- `health` should stay cheap like liveness
- `ready` is the only place that should ping dependencies directly
- request context is an actor snapshot, not final write authority
- actor snapshot must support `anonymous`, `internal`, and `customer`
- request mode must be known before business logic starts
- public requests must resolve tenant from a trusted host signal on the server
- never read raw `x-forwarded-host` directly in application code
- unresolved public tenant means early `404`, not a later empty response
- internal requests must not take tenant scope from host

## Access direction

- the platform can have its own platform-level users later
- tenants can have tenant-level users later
- partners can have partner-level users later
- customers must stay outside `users`, `memberships`, and internal roles
- customer auth uses `email + verification code`, then a customer session
- the verification code is proof of email control, not the session itself
- customer actors do not use internal roles
- access to features should be determined by profile and scope, not by UI alone
- read path may use snapshot context directly
- write path must use `DbService.runWriteAction` and a fresh scope resolved from the database
- `runWriteAction` input `userId` must come from trusted auth/session state only
- `runWriteAction` input `userId` must never come from body, query params, or user-controlled route values
- the extra database round-trip on write is an accepted cost of correctness
- never cache a live write scope across requests
- live scope must resolve against the target tenant and target partner, not just `userId`
- platform writes may carry a target tenant or partner context for audit and session scoping, even though platform permissions remain global
- RLS owns tenant and partner isolation, not frontend filters or ad hoc `if` checks
- internal core uses fixed profiles: `platform`, `tenant`, `partner`
- partner records and partner-scoped memberships are platform-managed by default
- if tenant partner management is enabled later, it should be enabled by one backend switch for that tenant, not by hardcoded exceptions
- customer access must be identity-based, not membership-role-based
- future public listing logic needs its own public RLS policy and its own safe read model
