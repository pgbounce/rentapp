# Architecture

## Products

- `web` is the public client.
- `api` is the only backend source of truth.
- `worker` handles background work outside user requests.

## Product model

- the platform is your whole system
- a `tenant` is a rental business using the system
- a `partner` is a car supplier working inside a tenant

This distinction is critical:

- a future external client of your backend is a `tenant`
- a company adding cars to your public website is a `partner`
- a partner is never the top-level owner of the platform

## Current business direction

- `tenant_1` is your own main tenant
- future tenants use the backend for their own site and admin work
- partner support belongs to the shared product model, not to a one-off tenant exception

## Internal access model

- internal access is fixed by profile, not by per-tenant feature flags
- `platform` means global access across the whole system
- `tenant` means full access inside one tenant
- `partner` means limited access inside one tenant and one partner scope
- `anonymous` and `customer` stay separate from internal access

This keeps the core simple:

- every tenant follows the same core access model
- every partner follows the same core access model
- differences between users come from scope, not from tenant-specific exceptions
- partner creation is platform-only by default
- future tenant partner management should be enabled by one explicit backend switch, not by hardcoded tenant exceptions

## Communication

- `web` talks to `api` over HTTP.
- `api` is the only layer allowed to own business logic.
- `worker` will use the same infrastructure as `api`, but outside request flow.

## Access model

- `users` are internal platform, tenant, and partner accounts
- password hashes live outside `users`, in `user_credentials`
- future rental customers should be modeled separately from internal access
- a customer is a separate actor, never a `membership` role
- customer auth should stay separate from internal auth
- customer auth is planned as `email + verification code`, followed by a customer session
- a customer actor does not carry internal roles

## Customer panel status

- customer panel is not implemented yet as a feature
- current core only prepares the system for a future customer actor
- current core already distinguishes customer access from internal users and memberships
- current core already reserves identity-based customer access by `tenantId` and `customerId`
- current core does not yet include customer tables, login codes, customer sessions, booking access rules, or customer endpoints
- this is intentional: customer access must be added as a separate layer on top of the current core, not mixed into internal auth

## Access resolution

- request context carries an actor snapshot, not final write authority
- read paths may use the snapshot directly
- write paths must resolve fresh scope from PostgreSQL right before the transaction
- tenant and partner isolation must still be enforced by PostgreSQL RLS
- actor checks and resource checks must stay separate from each other
- the actor snapshot must be able to represent `anonymous`, `internal`, and `customer`
- customer access should stay identity-scoped by `tenantId` and `customerId`
- future customer tables must keep email uniqueness per tenant, never globally
- platform write scope may still carry explicit `tenantId` and `partnerId` when a platform user acts inside a chosen target context
- this target context is for auditability and write-session context, not for reducing platform permissions
- internal core now uses fixed profiles: `platform`, `tenant`, `partner`

## Request foundation

- requests are split into `system`, `public`, and `internal`
- `system` currently covers health endpoints
- `internal` is reserved for `/api/v1/internal/*`
- `public` resolves tenant context from host subdomain to `tenants.slug`
- public tenant resolution must trust only the host resolved by the server runtime, never raw forwarded headers read manually
- a public request without a resolved tenant must stop immediately with `404`
- internal request target scope is not taken from host
- future internal target scope should come from the route of the action itself
- the current write entrypoint is `DbService.runWriteAction`
- `runWriteAction` resolves the internal actor live from PostgreSQL inside the write transaction
- `runWriteAction` expects `userId` from trusted auth state only, never from request body, query string, or route params supplied by the caller
- future public read features need their own RLS policy scoped by `tenant_id`
- future public read features also need an explicit safe column list in the query layer

## Core-only deferred items

- internal auth is not implemented yet, so request context does not yet receive real internal identities from a login module
- customer auth is not implemented yet, so customer actors are foundation-only for now
- public catalog and public listing RLS are not implemented yet
- customer tables, login codes, sessions, and customer endpoints are not implemented yet
- `runWriteAction` currently guarantees only fresh actor resolution and transaction scope
- feature-level writes must still validate their target resource inside the transaction
- current public tenant resolution supports host subdomain to `tenants.slug`; custom domains can be added later as a separate foundation step
- current runtime trusts only direct server host resolution; if a reverse proxy is introduced later, proxy trust must be configured explicitly before forwarded headers are used anywhere

## Foundation runtime

- `api` already owns shared runtime concerns:
- environment config
- PostgreSQL connection
- Redis connection
- request id
- request context
- unified API errors
- liveness and readiness checks
- structured request logging

Database access is split on purpose:

- migrations use an admin database role
- runtime `api` and `worker` use a restricted app role
- tenant isolation must never depend on connecting as `postgres`

## Shared packages

- `config` holds environment parsing and app config primitives.
- `contracts` holds shared API shapes.
- `db` holds database setup and schema files.
- `redis` holds shared Redis connection primitives.

## Future direction

- partner and admin panels should become additional clients of the same `api`
- backend can move to a separate server without changing frontend architecture
- business logic must stay in `api`, never in `web`
- tenant and partner logic must stay separate from each other
