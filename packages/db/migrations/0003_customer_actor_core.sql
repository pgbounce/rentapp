create type actor_kind as enum ('anonymous', 'internal', 'customer');

create or replace function app.current_actor_kind()
returns actor_kind
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('app.actor_kind', true), '')::actor_kind,
    'anonymous'::actor_kind
  )
$$;

create or replace function app.current_customer_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.customer_id', true), '')::uuid
$$;

create or replace function app.current_customer_account_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.customer_account_id', true), '')::uuid
$$;

create or replace function app.is_anonymous_actor()
returns boolean
language sql
stable
as $$
  select app.current_actor_kind() = 'anonymous'::actor_kind
$$;

create or replace function app.is_internal_actor()
returns boolean
language sql
stable
as $$
  select app.current_actor_kind() = 'internal'::actor_kind
$$;

create or replace function app.is_customer_actor()
returns boolean
language sql
stable
as $$
  select app.current_actor_kind() = 'customer'::actor_kind
$$;

create or replace function app.is_platform_role()
returns boolean
language sql
stable
as $$
  select
    app.is_internal_actor()
    and app.current_role() in ('platform_owner', 'platform_admin')
$$;

create or replace function app.is_tenant_role()
returns boolean
language sql
stable
as $$
  select
    app.is_internal_actor()
    and app.current_role() in ('tenant_owner', 'tenant_admin', 'tenant_staff')
$$;

create or replace function app.is_tenant_manager()
returns boolean
language sql
stable
as $$
  select
    app.is_internal_actor()
    and app.current_role() in ('tenant_owner', 'tenant_admin')
$$;

create or replace function app.is_partner_role()
returns boolean
language sql
stable
as $$
  select
    app.is_internal_actor()
    and app.current_role() in ('partner_admin', 'partner_staff')
$$;
