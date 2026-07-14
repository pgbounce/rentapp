do $$
begin
  if exists (
    select 1
    from (
      select lower(btrim(slug)) as normalized_slug
      from tenants
      group by lower(btrim(slug))
      having count(*) > 1
    ) as duplicate_tenant_slugs
  ) then
    raise exception 'Cannot normalize tenants.slug because case-insensitive duplicates exist';
  end if;

  if exists (
    select 1
    from (
      select tenant_id, lower(btrim(slug)) as normalized_slug
      from partners
      group by tenant_id, lower(btrim(slug))
      having count(*) > 1
    ) as duplicate_partner_slugs
  ) then
    raise exception 'Cannot normalize partners.slug because case-insensitive duplicates exist inside one tenant';
  end if;

  if exists (
    select 1
    from (
      select tenant_id, lower(btrim(slug)) as normalized_slug
      from locations
      group by tenant_id, lower(btrim(slug))
      having count(*) > 1
    ) as duplicate_location_slugs
  ) then
    raise exception 'Cannot normalize locations.slug because case-insensitive duplicates exist inside one tenant';
  end if;

  if exists (
    select 1
    from (
      select tenant_id, lower(btrim(slug)) as normalized_slug
      from cars
      group by tenant_id, lower(btrim(slug))
      having count(*) > 1
    ) as duplicate_car_slugs
  ) then
    raise exception 'Cannot normalize cars.slug because case-insensitive duplicates exist inside one tenant';
  end if;

  if exists (
    select 1
    from (
      select lower(btrim(email)) as normalized_email
      from users
      group by lower(btrim(email))
      having count(*) > 1
    ) as duplicate_emails
  ) then
    raise exception 'Cannot normalize users.email because case-insensitive duplicates exist';
  end if;
end
$$;

update tenants
set slug = lower(btrim(slug));

update partners
set slug = lower(btrim(slug));

update locations
set slug = lower(btrim(slug));

update cars
set slug = lower(btrim(slug));

update users
set email = lower(btrim(email));

alter table tenants
add constraint tenants_slug_format_check
check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

alter table partners
add constraint partners_slug_format_check
check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

alter table locations
add constraint locations_slug_format_check
check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

alter table cars
add constraint cars_slug_format_check
check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

alter table users
add constraint users_email_normalized_check
check (email <> '' and email = lower(btrim(email)) and email !~ E'\\s');
