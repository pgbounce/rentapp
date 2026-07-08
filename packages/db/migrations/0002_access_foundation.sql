create table user_credentials (
  user_id uuid primary key references users (id) on delete cascade,
  password_hash varchar(255) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into user_credentials (user_id, password_hash, created_at, updated_at)
select id, password_hash, created_at, updated_at
from users
where password_hash is not null
on conflict (user_id) do nothing;

alter table users drop column password_hash;

create trigger user_credentials_touch_updated_at
before update on user_credentials
for each row
execute function app.touch_updated_at();

alter table user_credentials enable row level security;
alter table user_credentials force row level security;

create policy user_credentials_select_policy
on user_credentials
for select
using (
  app.is_platform_role()
  or user_id = app.current_user_id()
);

create policy user_credentials_insert_policy
on user_credentials
for insert
with check (
  app.is_platform_role()
  or user_id = app.current_user_id()
);

create policy user_credentials_update_policy
on user_credentials
for update
using (
  app.is_platform_role()
  or user_id = app.current_user_id()
)
with check (
  app.is_platform_role()
  or user_id = app.current_user_id()
);

create policy user_credentials_delete_policy
on user_credentials
for delete
using (app.is_platform_role());

grant usage on schema public to {{app_role}};
grant usage on schema app to {{app_role}};
revoke create on schema public from {{app_role}};

grant select, insert, update, delete
on table
  tenants,
  partners,
  users,
  user_credentials,
  memberships,
  locations,
  cars,
  car_locations
to {{app_role}};

grant usage, select
on all sequences in schema public
to {{app_role}};

grant execute
on all functions in schema app
to {{app_role}};

alter default privileges in schema public
grant select, insert, update, delete
on tables
to {{app_role}};

alter default privileges in schema public
grant usage, select
on sequences
to {{app_role}};

alter default privileges in schema app
grant execute
on functions
to {{app_role}};
