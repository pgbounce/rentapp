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
- `tenant_1` can manage partners
- future tenants use the backend for their own site and admin work
- future tenants do not get partner management by default

This must be modeled as capability, not as a hardcoded one-off exception.

## Capability model

- tenant features should be controlled by explicit capabilities
- `partner_management` should be enabled only for your main tenant at the start
- future tenants should work without that capability unless you decide otherwise later

This keeps the system flexible:

- today: only your tenant can add partners
- tomorrow: other tenants can stay simpler
- later: if business changes, capability can be enabled per tenant without redesigning the core

## Communication

- `web` talks to `api` over HTTP.
- `api` is the only layer allowed to own business logic.
- `worker` will use the same infrastructure as `api`, but outside request flow.

## Shared packages

- `config` holds environment parsing and app config primitives.
- `contracts` holds shared API shapes.
- `db` holds database setup and schema files.

## Future direction

- partner and admin panels should become additional clients of the same `api`
- backend can move to a separate server without changing frontend architecture
- business logic must stay in `api`, never in `web`
- tenant and partner logic must stay separate from each other
