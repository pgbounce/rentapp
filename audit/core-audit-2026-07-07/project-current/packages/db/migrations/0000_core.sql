create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create schema if not exists app;

create or replace function app.uuid_v7()
returns uuid
language plpgsql
volatile
as $$
declare
  milliseconds bigint;
  random_bytes bytea;
  bytes bytea;
  hex text;
begin
  milliseconds := floor(extract(epoch from clock_timestamp()) * 1000);
  random_bytes := gen_random_bytes(10);
  bytes :=
    decode(lpad(to_hex(milliseconds), 12, '0'), 'hex')
    || decode('7' || substr(encode(random_bytes, 'hex'), 2, 3), 'hex')
    || decode(
      lpad(to_hex((get_byte(random_bytes, 2) & 63) | 128), 2, '0'),
      'hex'
    )
    || decode(substr(encode(random_bytes, 'hex'), 7, 14), 'hex');
  hex := encode(bytes, 'hex');

  return (
    substr(hex, 1, 8) || '-'
    || substr(hex, 9, 4) || '-'
    || substr(hex, 13, 4) || '-'
    || substr(hex, 17, 4) || '-'
    || substr(hex, 21, 12)
  )::uuid;
end;
$$;

create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function app.current_tenant_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.tenant_id', true), '')::uuid
$$;

create or replace function app.current_partner_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.partner_id', true), '')::uuid
$$;

create or replace function app.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

create or replace function app.current_role()
returns text
language sql
stable
as $$
  select nullif(current_setting('app.role', true), '')
$$;

create or replace function app.current_capabilities()
returns text[]
language sql
stable
as $$
  select coalesce(
    string_to_array(nullif(current_setting('app.capabilities', true), ''), ','),
    array[]::text[]
  )
$$;

create or replace function app.has_capability(capability text)
returns boolean
language sql
stable
as $$
  select capability = any(app.current_capabilities())
$$;

create or replace function app.is_platform_role()
returns boolean
language sql
stable
as $$
  select app.current_role() in ('platform_owner', 'platform_admin')
$$;

create or replace function app.is_tenant_role()
returns boolean
language sql
stable
as $$
  select app.current_role() in ('tenant_owner', 'tenant_admin', 'tenant_staff')
$$;

create or replace function app.is_tenant_manager()
returns boolean
language sql
stable
as $$
  select app.current_role() in ('tenant_owner', 'tenant_admin')
$$;

create or replace function app.is_partner_role()
returns boolean
language sql
stable
as $$
  select app.current_role() in ('partner_admin', 'partner_staff')
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
      and app.is_tenant_manager()
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
      and app.is_tenant_manager()
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
      and app.is_tenant_manager()
      and (
        target_partner_id is null
        or app.has_capability('partner_management')
      )
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
      and app.is_tenant_manager()
      and app.has_capability('partner_management')
    )
$$;

create type tenant_kind as enum ('platform', 'customer');
create type tenant_capability as enum ('partner_management');
create type tenant_status as enum ('active', 'inactive');
create type partner_status as enum ('active', 'inactive');
create type user_status as enum ('invited', 'active', 'suspended');
create type membership_scope as enum ('platform', 'tenant', 'partner');
create type membership_role as enum (
  'platform_owner',
  'platform_admin',
  'tenant_owner',
  'tenant_admin',
  'tenant_staff',
  'partner_admin',
  'partner_staff'
);
create type membership_status as enum ('invited', 'active', 'disabled');
create type location_status as enum ('active', 'inactive');
create type car_status as enum ('draft', 'active', 'inactive');
create type car_transmission as enum ('manual', 'automatic');
create type car_fuel_type as enum (
  'petrol',
  'diesel',
  'hybrid',
  'plug_in_hybrid',
  'electric',
  'lpg'
);
create type car_location_kind as enum ('pickup', 'return', 'both');

create table tenants (
  id uuid primary key default app.uuid_v7(),
  slug varchar(80) not null,
  name varchar(120) not null,
  kind tenant_kind not null default 'customer',
  status tenant_status not null default 'active',
  capabilities tenant_capability[] not null default '{}'::tenant_capability[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index tenants_slug_unique on tenants (slug);

create table partners (
  id uuid primary key default app.uuid_v7(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  slug varchar(80) not null,
  name varchar(120) not null,
  status partner_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partners_tenant_slug_unique unique (tenant_id, slug),
  constraint partners_tenant_id_id_unique unique (tenant_id, id)
);

create index partners_tenant_id_idx on partners (tenant_id);

create table users (
  id uuid primary key default app.uuid_v7(),
  email varchar(320) not null,
  display_name varchar(120),
  password_hash varchar(255),
  status user_status not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index users_email_unique on users (email);

create table memberships (
  id uuid primary key default app.uuid_v7(),
  user_id uuid not null references users (id) on delete cascade,
  tenant_id uuid references tenants (id) on delete cascade,
  partner_id uuid,
  scope membership_scope not null,
  role membership_role not null,
  status membership_status not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memberships_scope_check check (
    (scope = 'platform' and tenant_id is null and partner_id is null)
    or (scope = 'tenant' and tenant_id is not null and partner_id is null)
    or (scope = 'partner' and tenant_id is not null and partner_id is not null)
  ),
  constraint memberships_partner_tenant_fk
    foreign key (tenant_id, partner_id)
    references partners (tenant_id, id)
    on delete cascade
);

create index memberships_user_id_idx on memberships (user_id);
create index memberships_tenant_id_idx on memberships (tenant_id);
create index memberships_partner_id_idx on memberships (partner_id);

create table locations (
  id uuid primary key default app.uuid_v7(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  slug varchar(80) not null,
  name varchar(120) not null,
  country_code varchar(2) not null,
  city varchar(120) not null,
  address_line_1 varchar(160) not null,
  postal_code varchar(20) not null,
  status location_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint locations_tenant_slug_unique unique (tenant_id, slug),
  constraint locations_tenant_id_id_unique unique (tenant_id, id)
);

create index locations_tenant_id_idx on locations (tenant_id);

create table cars (
  id uuid primary key default app.uuid_v7(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  partner_id uuid,
  slug varchar(80) not null,
  brand varchar(80) not null,
  model varchar(80) not null,
  production_year integer not null,
  transmission car_transmission not null,
  fuel_type car_fuel_type not null,
  seat_count integer not null,
  door_count integer not null,
  luggage_count integer not null,
  status car_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cars_tenant_slug_unique unique (tenant_id, slug),
  constraint cars_tenant_id_id_unique unique (tenant_id, id),
  constraint cars_production_year_check check (production_year between 1886 and 2100),
  constraint cars_seat_count_check check (seat_count > 0),
  constraint cars_door_count_check check (door_count > 0),
  constraint cars_luggage_count_check check (luggage_count >= 0),
  constraint cars_partner_tenant_fk
    foreign key (tenant_id, partner_id)
    references partners (tenant_id, id)
    on delete no action
);

create index cars_tenant_id_idx on cars (tenant_id);
create index cars_tenant_partner_id_idx on cars (tenant_id, partner_id);

create table car_locations (
  tenant_id uuid not null references tenants (id) on delete cascade,
  car_id uuid not null,
  location_id uuid not null,
  kind car_location_kind not null default 'both',
  constraint car_locations_pk primary key (tenant_id, car_id, location_id),
  constraint car_locations_car_tenant_fk
    foreign key (tenant_id, car_id)
    references cars (tenant_id, id)
    on delete cascade,
  constraint car_locations_location_tenant_fk
    foreign key (tenant_id, location_id)
    references locations (tenant_id, id)
    on delete cascade
);

create index car_locations_location_id_idx on car_locations (tenant_id, location_id);

create trigger tenants_touch_updated_at
before update on tenants
for each row
execute function app.touch_updated_at();

create trigger partners_touch_updated_at
before update on partners
for each row
execute function app.touch_updated_at();

create trigger users_touch_updated_at
before update on users
for each row
execute function app.touch_updated_at();

create trigger memberships_touch_updated_at
before update on memberships
for each row
execute function app.touch_updated_at();

create trigger locations_touch_updated_at
before update on locations
for each row
execute function app.touch_updated_at();

create trigger cars_touch_updated_at
before update on cars
for each row
execute function app.touch_updated_at();

alter table tenants enable row level security;
alter table tenants force row level security;
alter table partners enable row level security;
alter table partners force row level security;
alter table users enable row level security;
alter table users force row level security;
alter table memberships enable row level security;
alter table memberships force row level security;
alter table locations enable row level security;
alter table locations force row level security;
alter table cars enable row level security;
alter table cars force row level security;
alter table car_locations enable row level security;
alter table car_locations force row level security;

create policy tenants_select_policy
on tenants
for select
using (
  app.is_platform_role()
  or id = app.current_tenant_id()
);

create policy tenants_insert_policy
on tenants
for insert
with check (app.is_platform_role());

create policy tenants_update_policy
on tenants
for update
using (
  app.is_platform_role()
  or (
    id = app.current_tenant_id()
    and app.is_tenant_manager()
  )
)
with check (
  app.is_platform_role()
  or (
    id = app.current_tenant_id()
    and app.is_tenant_manager()
  )
);

create policy tenants_delete_policy
on tenants
for delete
using (app.is_platform_role());

create policy partners_select_policy
on partners
for select
using (app.can_read_partner_scope(tenant_id, id));

create policy partners_insert_policy
on partners
for insert
with check (app.can_manage_partners(tenant_id));

create policy partners_update_policy
on partners
for update
using (app.can_read_partner_scope(tenant_id, id))
with check (app.can_manage_partners(tenant_id));

create policy partners_delete_policy
on partners
for delete
using (app.can_manage_partners(tenant_id));

create policy users_select_policy
on users
for select
using (
  app.is_platform_role()
  or exists (
    select 1
    from memberships
    where memberships.user_id = users.id
      and (
        app.can_manage_memberships(memberships.tenant_id, memberships.partner_id)
        or app.can_read_partner_scope(memberships.tenant_id, memberships.partner_id)
      )
  )
);

create policy users_insert_policy
on users
for insert
with check (app.is_platform_role());

create policy users_update_policy
on users
for update
using (app.is_platform_role())
with check (app.is_platform_role());

create policy users_delete_policy
on users
for delete
using (app.is_platform_role());

create policy memberships_select_policy
on memberships
for select
using (
  app.is_platform_role()
  or (
    tenant_id = app.current_tenant_id()
    and app.is_tenant_role()
  )
  or (
    tenant_id = app.current_tenant_id()
    and partner_id = app.current_partner_id()
    and app.is_partner_role()
  )
);

create policy memberships_insert_policy
on memberships
for insert
with check (app.can_manage_memberships(tenant_id, partner_id));

create policy memberships_update_policy
on memberships
for update
using (
  app.is_platform_role()
  or (
    tenant_id = app.current_tenant_id()
    and app.is_tenant_role()
  )
  or (
    tenant_id = app.current_tenant_id()
    and partner_id = app.current_partner_id()
    and app.is_partner_role()
  )
)
with check (app.can_manage_memberships(tenant_id, partner_id));

create policy memberships_delete_policy
on memberships
for delete
using (app.can_manage_memberships(tenant_id, partner_id));

create policy locations_select_policy
on locations
for select
using (
  app.is_platform_role()
  or tenant_id = app.current_tenant_id()
);

create policy locations_insert_policy
on locations
for insert
with check (app.can_manage_tenant_scope(tenant_id));

create policy locations_update_policy
on locations
for update
using (
  app.is_platform_role()
  or tenant_id = app.current_tenant_id()
)
with check (app.can_manage_tenant_scope(tenant_id));

create policy locations_delete_policy
on locations
for delete
using (app.can_manage_tenant_scope(tenant_id));

create policy cars_select_policy
on cars
for select
using (app.can_read_partner_scope(tenant_id, partner_id));

create policy cars_insert_policy
on cars
for insert
with check (app.can_manage_partner_scope(tenant_id, partner_id));

create policy cars_update_policy
on cars
for update
using (app.can_read_partner_scope(tenant_id, partner_id))
with check (app.can_manage_partner_scope(tenant_id, partner_id));

create policy cars_delete_policy
on cars
for delete
using (app.can_manage_partner_scope(tenant_id, partner_id));

create policy car_locations_select_policy
on car_locations
for select
using (
  app.is_platform_role()
  or exists (
    select 1
    from cars
    where cars.tenant_id = car_locations.tenant_id
      and cars.id = car_locations.car_id
      and app.can_read_partner_scope(cars.tenant_id, cars.partner_id)
  )
);

create policy car_locations_insert_policy
on car_locations
for insert
with check (
  app.is_platform_role()
  or exists (
    select 1
    from cars
    where cars.tenant_id = car_locations.tenant_id
      and cars.id = car_locations.car_id
      and app.can_manage_partner_scope(cars.tenant_id, cars.partner_id)
  )
);

create policy car_locations_update_policy
on car_locations
for update
using (
  app.is_platform_role()
  or exists (
    select 1
    from cars
    where cars.tenant_id = car_locations.tenant_id
      and cars.id = car_locations.car_id
      and app.can_read_partner_scope(cars.tenant_id, cars.partner_id)
  )
)
with check (
  app.is_platform_role()
  or exists (
    select 1
    from cars
    where cars.tenant_id = car_locations.tenant_id
      and cars.id = car_locations.car_id
      and app.can_manage_partner_scope(cars.tenant_id, cars.partner_id)
  )
);

create policy car_locations_delete_policy
on car_locations
for delete
using (
  app.is_platform_role()
  or exists (
    select 1
    from cars
    where cars.tenant_id = car_locations.tenant_id
      and cars.id = car_locations.car_id
      and app.can_manage_partner_scope(cars.tenant_id, cars.partner_id)
  )
);
