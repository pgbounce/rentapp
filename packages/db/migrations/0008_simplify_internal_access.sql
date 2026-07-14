drop function if exists app.resolve_internal_write_actor(uuid, uuid, uuid);

create type membership_role_next as enum ('platform', 'tenant', 'partner');

alter table memberships
alter column role type membership_role_next
using (
  case
    when role::text in ('platform_owner', 'platform_admin') then 'platform'
    when role::text in ('tenant_owner', 'tenant_admin', 'tenant_staff') then 'tenant'
    when role::text in ('partner_admin', 'partner_staff') then 'partner'
    else null
  end
)::membership_role_next;

drop type membership_role;

alter type membership_role_next rename to membership_role;

alter table memberships
add constraint memberships_role_scope_match_check
check (scope::text = role::text);

alter table tenants
drop column capabilities;

create or replace function app.is_platform_role()
returns boolean
language sql
stable
as $$
  select
    app.is_internal_actor()
    and app.current_role() = 'platform'
$$;

create or replace function app.is_tenant_role()
returns boolean
language sql
stable
as $$
  select
    app.is_internal_actor()
    and app.current_role() = 'tenant'
$$;

create or replace function app.is_tenant_manager()
returns boolean
language sql
stable
as $$
  select app.is_tenant_role()
$$;

create or replace function app.is_partner_role()
returns boolean
language sql
stable
as $$
  select
    app.is_internal_actor()
    and app.current_role() = 'partner'
$$;

create or replace function app.can_read_partner_scope(target_tenant_id uuid, target_partner_id uuid)
returns boolean
language sql
stable
as $$
  select
    app.is_platform_role()
    or (target_tenant_id = app.current_tenant_id() and app.is_tenant_role())
    or (
      target_tenant_id = app.current_tenant_id()
      and app.is_partner_role()
      and target_partner_id = app.current_partner_id()
    )
$$;

create or replace function app.can_manage_tenant_scope(target_tenant_id uuid)
returns boolean
language sql
stable
as $$
  select
    app.is_platform_role()
    or (
      target_tenant_id = app.current_tenant_id()
      and app.is_tenant_role()
    )
$$;

create or replace function app.can_manage_partner_scope(target_tenant_id uuid, target_partner_id uuid)
returns boolean
language sql
stable
as $$
  select
    app.is_platform_role()
    or (
      target_tenant_id = app.current_tenant_id()
      and app.is_tenant_role()
    )
    or (
      target_tenant_id = app.current_tenant_id()
      and app.is_partner_role()
      and target_partner_id = app.current_partner_id()
    )
$$;

create or replace function app.can_manage_memberships(target_tenant_id uuid, target_partner_id uuid)
returns boolean
language sql
stable
as $$
  select
    app.is_platform_role()
    or (
      target_tenant_id = app.current_tenant_id()
      and app.is_tenant_role()
    )
$$;

create or replace function app.can_manage_partners(target_tenant_id uuid)
returns boolean
language sql
stable
as $$
  select
    app.is_platform_role()
    or (
      target_tenant_id = app.current_tenant_id()
      and app.is_tenant_role()
    )
$$;

drop function if exists app.has_capability(text);
drop function if exists app.current_capabilities();

drop type tenant_capability;

create or replace function app.resolve_internal_write_actor(
  target_user_id uuid,
  target_tenant_id uuid,
  target_partner_id uuid
)
returns table (
  user_id uuid,
  role membership_role,
  tenant_id uuid,
  partner_id uuid
)
language sql
volatile
security definer
set search_path = public, app
as $$
  with candidates as (
    (
      select *
      from (
        select
          users.id as user_id,
          memberships.role,
          null::uuid as tenant_id,
          null::uuid as partner_id,
          0 as priority
        from users
        join memberships
          on memberships.user_id = users.id
         and memberships.status = 'active'
        where users.id = target_user_id
          and users.status = 'active'
          and memberships.scope = 'platform'
          and target_tenant_id is null
          and target_partner_id is null
        for update of users, memberships
      ) as platform_global_candidate
    )
    union all
    (
      select *
      from (
        select
          users.id as user_id,
          memberships.role,
          tenants.id as tenant_id,
          null::uuid as partner_id,
          0 as priority
        from users
        join memberships
          on memberships.user_id = users.id
         and memberships.status = 'active'
        join tenants
          on tenants.id = target_tenant_id
         and tenants.status = 'active'
        where users.id = target_user_id
          and users.status = 'active'
          and memberships.scope = 'platform'
          and target_tenant_id is not null
          and target_partner_id is null
        for update of users, memberships, tenants
      ) as platform_tenant_candidate
    )
    union all
    (
      select *
      from (
        select
          users.id as user_id,
          memberships.role,
          tenants.id as tenant_id,
          partners.id as partner_id,
          0 as priority
        from users
        join memberships
          on memberships.user_id = users.id
         and memberships.status = 'active'
        join tenants
          on tenants.id = target_tenant_id
         and tenants.status = 'active'
        join partners
          on partners.tenant_id = target_tenant_id
         and partners.id = target_partner_id
         and partners.status = 'active'
        where users.id = target_user_id
          and users.status = 'active'
          and memberships.scope = 'platform'
          and target_tenant_id is not null
          and target_partner_id is not null
        for update of users, memberships, tenants, partners
      ) as platform_partner_candidate
    )
    union all
    (
      select *
      from (
        select
          users.id as user_id,
          memberships.role,
          memberships.tenant_id,
          null::uuid as partner_id,
          1 as priority
        from users
        join memberships
          on memberships.user_id = users.id
         and memberships.status = 'active'
        join tenants
          on tenants.id = memberships.tenant_id
         and tenants.status = 'active'
        where users.id = target_user_id
          and users.status = 'active'
          and memberships.scope = 'tenant'
          and target_tenant_id is not null
          and target_partner_id is null
          and memberships.tenant_id = target_tenant_id
        for update of users, memberships, tenants
      ) as tenant_candidate
    )
    union all
    (
      select *
      from (
        select
          users.id as user_id,
          memberships.role,
          memberships.tenant_id,
          memberships.partner_id,
          2 as priority
        from users
        join memberships
          on memberships.user_id = users.id
         and memberships.status = 'active'
        join tenants
          on tenants.id = memberships.tenant_id
         and tenants.status = 'active'
        join partners
          on partners.tenant_id = memberships.tenant_id
         and partners.id = memberships.partner_id
         and partners.status = 'active'
        where users.id = target_user_id
          and users.status = 'active'
          and memberships.scope = 'partner'
          and target_tenant_id is not null
          and target_partner_id is not null
          and memberships.tenant_id = target_tenant_id
          and memberships.partner_id = target_partner_id
        for update of users, memberships, tenants, partners
      ) as partner_candidate
    )
  )
  select user_id, role, tenant_id, partner_id
  from candidates
  order by priority
  limit 1
$$;
