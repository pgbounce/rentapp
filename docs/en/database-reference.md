# Database Reference

## Identifier map

| Field | Table | Type | Depends on | `NULL` | Scope | Meaning |
| --- | --- | --- | --- | --- | --- | --- |
| `tenants.id` | `tenants` | `uuid` | primary key | no | global | one rental business |
| `partners.id` | `partners` | `uuid` | primary key | no | tenant logical scope | one partner inside one tenant |
| `partners.tenant_id` | `partners` | `uuid` | `tenants.id` | no | tenant | tenant owner of partner |
| `users.id` | `users` | `uuid` | primary key | no | global | one internal user |
| `user_credentials.user_id` | `user_credentials` | `uuid` | `users.id` | no | global | login row of one user |
| `memberships.id` | `memberships` | `uuid` | primary key | no | global | one role assignment row |
| `memberships.user_id` | `memberships` | `uuid` | `users.id` | no | global | assigned user |
| `memberships.tenant_id` | `memberships` | `uuid` | `tenants.id` | yes | tenant | tenant scope of assignment |
| `memberships.partner_id` | `memberships` | `uuid` | `partners.id` with same `tenant_id` | yes | tenant | partner scope of assignment |
| `locations.id` | `locations` | `uuid` | primary key | no | tenant logical scope | one location |
| `locations.tenant_id` | `locations` | `uuid` | `tenants.id` | no | tenant | owner tenant of location |
| `cars.id` | `cars` | `uuid` | primary key | no | tenant logical scope | one car |
| `cars.tenant_id` | `cars` | `uuid` | `tenants.id` | no | tenant | owner tenant of car |
| `cars.partner_id` | `cars` | `uuid` | `partners.id` with same `tenant_id` | yes | tenant | optional partner owner |
| `car_locations.tenant_id` | `car_locations` | `uuid` | `tenants.id` | no | tenant | part of composite primary key |
| `car_locations.car_id` | `car_locations` | `uuid` | `cars.id` with same `tenant_id` | no | tenant | linked car |
| `car_locations.location_id` | `car_locations` | `uuid` | `locations.id` with same `tenant_id` | no | tenant | linked location |

## Table purposes

| Table | Purpose |
| --- | --- |
| `tenants` | top-level rental companies using the system |
| `partners` | suppliers working inside one tenant |
| `users` | internal users of platform, tenants, and partners |
| `user_credentials` | password hashes stored separately from `users` |
| `memberships` | internal user profile assignments by scope |
| `locations` | pickup and return locations of one tenant |
| `cars` | cars and their basic descriptive fields |
| `car_locations` | mapping between cars and locations |

## Key structural rules

- a partner always belongs to one tenant
- a partner-scope membership must have both `tenant_id` and `partner_id`
- a tenant-scope membership must have `tenant_id` but no `partner_id`
- `car_locations` has a composite primary key, not a standalone `id`
- there are still no business tables for `bookings`, `payments`, or customers

## Important columns

- `tenants.slug`: globally unique, lowercase tenant slug used by public host resolution
- `partners.slug`: lowercase slug unique only inside one tenant
- `users.email`: globally unique internal user email stored in normalized lowercase form
- `memberships.scope`: `platform`, `tenant`, or `partner`
- `memberships.role`: fixed internal profile
- `cars.partner_id`: optional partner ownership link
- `car_locations.kind`: `pickup`, `return`, or `both`

## Enums

| Enum | Values | Meaning |
| --- | --- | --- |
| `tenant_kind` | `platform`, `client` | type of tenant |
| `tenant_status` | `active`, `inactive` | tenant active state |
| `partner_status` | `active`, `inactive` | partner active state |
| `user_status` | `invited`, `active`, `suspended` | internal user state |
| `membership_scope` | `platform`, `tenant`, `partner` | scope of assignment |
| `membership_role` | `platform`, `tenant`, `partner` | fixed internal profile |
| `membership_status` | `invited`, `active`, `disabled` | membership state |
| `location_status` | `active`, `inactive` | location state |
| `car_status` | `draft`, `active`, `inactive` | car state |
| `car_transmission` | `manual`, `automatic` | transmission |
| `car_fuel_type` | `petrol`, `diesel`, `hybrid`, `plug_in_hybrid`, `electric`, `lpg` | fuel type |
| `car_location_kind` | `pickup`, `return`, `both` | location role for a car |
| `actor_kind` | `anonymous`, `internal`, `customer` | session actor type |

## Triggers and technical helpers

### `updated_at`

`app.touch_updated_at()` updates `updated_at` before `UPDATE`.

Today it is attached to:

- `tenants`
- `partners`
- `users`
- `memberships`
- `locations`
- `cars`
- `user_credentials`

### `clock_timestamp()`

The project uses `clock_timestamp()` instead of `now()` for update-touch behavior, so `updated_at` reflects the real execution moment inside the transaction.

### `uuid_v7()`

The project uses `app.uuid_v7()` instead of random `uuid v4`.

Practical reason:

- IDs stay hard to guess
- but are more time-ordered for indexes

## Check constraints

Examples of hard validation already in the database:

- `memberships_scope_check`
- `tenants_slug_format_check`
- `partners_slug_format_check`
- `locations_slug_format_check`
- `cars_slug_format_check`
- `users_email_normalized_check`
- `cars_production_year_check`
- `cars_seat_count_check`
- `cars_door_count_check`
- `cars_luggage_count_check`

That means the database itself rejects obviously invalid values.

## PostgreSQL extensions

| Extension | Used now | Why |
| --- | --- | --- |
| `pgcrypto` | yes | random bytes for `uuid_v7()` |
| `btree_gist` | not yet | currently unused future preparation |

## SQL function glossary

| Function | Plain meaning |
| --- | --- |
| `app.uuid_v7()` | generates a time-ordered UUID |
| `app.touch_updated_at()` | updates `updated_at` before `UPDATE` |
| `app.current_tenant_id()` | reads `app.tenant_id` from SQL session |
| `app.current_partner_id()` | reads `app.partner_id` from SQL session |
| `app.current_user_id()` | reads `app.user_id` from SQL session |
| `app.current_role()` | reads `app.role` from SQL session |
| `app.current_actor_kind()` | reads `app.actor_kind` from SQL session |
| `app.current_customer_id()` | reads `app.customer_id` from SQL session |
| `app.is_anonymous_actor()` | checks anonymous actor |
| `app.is_internal_actor()` | checks internal actor |
| `app.is_customer_actor()` | checks customer actor |
| `app.is_platform_role()` | checks `platform` profile |
| `app.is_tenant_role()` | checks `tenant` profile |
| `app.is_tenant_manager()` | compatibility alias of tenant role |
| `app.is_partner_role()` | checks `partner` profile |
| `app.can_read_partner_scope(tenant, partner)` | checks partner-scope read access |
| `app.can_manage_tenant_scope(tenant)` | checks tenant-scope management access |
| `app.can_manage_partner_scope(tenant, partner)` | checks partner-scope management access |
| `app.tenant_partner_management_enabled(tenant)` | future switch hook, currently always `false` |
| `app.can_manage_memberships(tenant, partner)` | checks membership management access |
| `app.can_manage_partners(tenant)` | checks partner management access |
| `app.resolve_public_tenant_id(slug)` | resolves active tenant by slug |
| `app.resolve_internal_write_actor(user, tenant, partner)` | resolves fresh internal write scope |

## RLS access matrix

### Role summary

- `platform` = global owner
- `tenant` = full tenant scope
- `partner` = limited partner scope

### Table summary

| Table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `tenants` | `platform` all; actor with matching `current_tenant_id` sees own tenant | only `platform` | `platform` or own `tenant` | only `platform` |
| `partners` | `platform` all; `tenant` sees partners of own tenant; `partner` sees only itself | only `platform` | same direction as insert, but row must also be visible | same as insert |
| `users` | `platform` all; `tenant` and `partner` only users with memberships in their scope | only `platform` | only `platform` | only `platform` |
| `user_credentials` | `platform` all; internal user sees own row | `platform` or self | `platform` or self | only `platform` |
| `memberships` | `platform` all; `tenant` sees memberships of own tenant; `partner` sees memberships of own partner | `platform`; `tenant` only for tenant-scoped memberships of its tenant | visible row plus `can_manage_memberships(...)` | same direction as insert |
| `locations` | `platform` all; matching tenant scope sees tenant locations | `platform` or own `tenant` | `platform` or own `tenant` | `platform` or own `tenant` |
| `cars` | `platform` all; `tenant` sees tenant cars; `partner` sees own cars | `platform`, own `tenant`, or own `partner` | visible row plus `can_manage_partner_scope(...)` | same direction as insert |
| `car_locations` | derived through car visibility | derived through car management scope | same direction as insert plus row visibility | same direction as insert |

## Practical access notes

- `platform` creates tenants and partners
- `tenant` may work inside its own rental business but does not create partners by default
- `partner` is restricted to its own scope
- `customer` does not yet have its own finished RLS model
