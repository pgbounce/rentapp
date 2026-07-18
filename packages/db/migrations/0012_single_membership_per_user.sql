do $$
begin
  if exists (
    select 1
    from memberships
    group by user_id
    having count(*) > 1
  ) then
    raise exception 'Cannot enforce single membership per user: duplicate memberships exist';
  end if;
end
$$;

drop index if exists memberships_actor_scope_unique;
drop index if exists memberships_user_id_idx;

create unique index memberships_user_id_unique
on memberships (user_id);
