create unique index memberships_actor_scope_unique
on memberships (user_id, tenant_id, partner_id, scope)
nulls not distinct;
