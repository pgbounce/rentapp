# Runtime Reference

## PostgreSQL session variables

Before a transaction runs, the API sets PostgreSQL session variables. RLS policies read those values.

| Variable | Set by | Value source | Why it exists |
| --- | --- | --- | --- |
| `app.actor_kind` | `applyDbSessionScope()` | `ActorSnapshot.actorKind` | distinguishes `anonymous`, `internal`, `customer` |
| `app.tenant_id` | `applyDbSessionScope()` | `snapshot.tenantId` | tells RLS which tenant scope is active |
| `app.partner_id` | `applyDbSessionScope()` | `snapshot.partnerId` for internal actors | tells RLS whether partner scope is active |
| `app.user_id` | `applyDbSessionScope()` | `snapshot.userId` for internal actors | allows internal self-scope checks |
| `app.customer_id` | `applyDbSessionScope()` | `snapshot.customerId` for customer actors | prepared for future customer access |
| `app.role` | `applyDbSessionScope()` | `snapshot.role` for internal actors | tells RLS whether actor is `platform`, `tenant`, or `partner` |

### Important current note

- public tenant resolution does not automatically set SQL tenant scope for anonymous actors
- that is why public tenant resolution exists today, but public catalog RLS does not

## Request modes

### `system`

This covers technical endpoints such as:

- `/api/v1/health`
- `/api/v1/health/live`
- `/api/v1/health/ready`

There is no tenant and no signed-in actor here.

### `public`

This covers requests that are not `system` and do not start with `/api/v1/internal`.

Rules:

- tenant is resolved from `request.hostname`
- the code uses host-derived runtime data, not raw `x-forwarded-host`
- if tenant resolution fails, the request stops with `404`
- tenant resolution depends on a `SECURITY DEFINER` SQL helper owned by the admin-side migration role

### `internal`

This covers requests starting with `/api/v1/internal`.

Rules:

- host does not define tenant scope
- future internal actions should provide explicit target scope themselves
- today there is still no real auth module, so internal request context is not yet backed by a login flow

## Request flow

1. `onRequest` assigns `requestId`
2. request start time is stored
3. temporary context starts as `system`
4. request mode resolver runs
5. if mode is `public`, tenant resolver may set `resolvedTenantId`
6. the request continues into NestJS routing

## Read path

`DbService.transaction()`:

- reads current actor snapshot from `AsyncLocalStorage`
- opens a DB transaction
- sets SQL session scope from that snapshot
- runs queries through Drizzle
- commits or rolls back

Use it for:

- reads
- lightweight operations that do not need fresh permission proof

## Write path

`DbService.runWriteAction()`:

- opens a DB transaction
- calls `app.resolve_internal_write_actor(userId, targetTenantId, targetPartnerId)`
- builds a fresh internal actor snapshot from the returned row
- sets SQL session scope from that fresh result
- exposes `db.expectMutation(...)` inside the callback for writes that must affect an exact number of rows
- runs the callback
- commits or rolls back

Important current rules:

- `runInTransaction()` uses plain `begin`, so write transactions currently run at PostgreSQL's default `READ COMMITTED` isolation level
- `runWriteAction()` locks only `users` and `memberships` while it proves the actor scope
- `runWriteAction()` does not serialize writes per tenant or per partner
- if a future feature needs tenant-level or resource-level serialization, that feature must take its own explicit lock inside the business transaction

Use it for:

- writes
- scope-sensitive operations
- anything that must not trust cached request auth state

## Error paths

### Unknown tenant

If a public tenant cannot be resolved:

- backend throws `tenant_not_found`
- HTTP response is `404`

### Invalid or inactive write actor

If `app.resolve_internal_write_actor(...)` returns no row:

- `runWriteAction()` throws `ForbiddenException`
- the operation stops before the business callback runs

### Unhandled server error

If a non-HTTP exception escapes:

- `HttpExceptionFilter` returns `500`
- API keeps one consistent error shape
- server logs keep the raw internal error name, message, and stack

### Write invariant mismatch

If a write callback uses `db.expectMutation(...)` and the query affects the wrong number of rows:

- backend logs `db.write_invariant_failed`
- the request fails as `500`
- this is treated as a backend bug or RLS mismatch, not as a normal business result

## Actor model

### `anonymous`

Minimal shape:

```json
{ "actorKind": "anonymous" }
```

Current meaning:

- can pass through system and public request flow
- cannot perform internal writes

### `customer`

Minimal shape:

```json
{
  "actorKind": "customer",
  "tenantId": "TENANT_ID",
  "customerId": "CUSTOMER_ID"
}
```

Current meaning:

- actor shape exists
- business customer features do not exist yet

### `internal`

Minimal shape:

```json
{
  "actorKind": "internal",
  "userId": "USER_ID",
  "role": "partner",
  "tenantId": "TENANT_ID",
  "partnerId": "PARTNER_ID"
}
```

Current meaning:

- this is the actor used by RLS-protected internal access
- current fixed internal profiles are `platform`, `tenant`, and `partner`

## Why `resolve_internal_write_actor` matters

This function is the center of safe write access.

It is important because it:

- checks fresh state directly in PostgreSQL
- verifies active user, membership, tenant, and partner state
- uses `SECURITY DEFINER` so it can safely read access tables before the final write scope is set
- works only if the role that owns that SQL function can bypass RLS with `SUPERUSER` or `BYPASSRLS`
- uses `FOR UPDATE` on `users` and `memberships` so the permission proof is not changed mid-write by another transaction

Important limit:

- this lock is about actor state, not tenant-wide write serialization
- tenant and partner rows are checked for active status, but they are not locked by `runWriteAction()`

## Priority inside write resolution

The SQL function resolves internal write scope in this order:

- `0` = platform
- `1` = tenant
- `2` = partner

That keeps global, tenant, and partner cases separated and predictable.
