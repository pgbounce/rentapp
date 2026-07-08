alter type tenant_kind rename value 'customer' to 'client';

alter table tenants
alter column kind set default 'client';
