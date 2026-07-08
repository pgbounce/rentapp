create or replace function app.tenant_partner_management_enabled(target_tenant_id uuid)
returns boolean
language sql
stable
as $$
  select false
$$;

create or replace function app.can_manage_memberships(target_tenant_id uuid, target_partner_id uuid)
returns boolean
language sql
stable
as $$
  select
    app.is_platform_role()
    or (
      target_partner_id is null
      and target_tenant_id = app.current_tenant_id()
      and app.is_tenant_role()
    )
    or (
      target_partner_id is not null
      and target_tenant_id = app.current_tenant_id()
      and app.is_tenant_role()
      and app.tenant_partner_management_enabled(target_tenant_id)
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
      and app.tenant_partner_management_enabled(target_tenant_id)
    )
$$;
