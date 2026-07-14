create or replace function app.resolve_internal_write_actor(
  target_user_id uuid,
  target_tenant_id uuid,
  target_partner_id uuid
)
returns table (
  user_id uuid,
  role membership_role,
  tenant_id uuid,
  partner_id uuid,
  capabilities text[]
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
          array[]::text[] as capabilities,
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
          array[]::text[] as capabilities,
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
          array[]::text[] as capabilities,
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
          coalesce(tenants.capabilities, '{}'::tenant_capability[])::text[] as capabilities,
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
          coalesce(tenants.capabilities, '{}'::tenant_capability[])::text[] as capabilities,
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
  select user_id, role, tenant_id, partner_id, capabilities
  from candidates
  order by priority
  limit 1
$$;
