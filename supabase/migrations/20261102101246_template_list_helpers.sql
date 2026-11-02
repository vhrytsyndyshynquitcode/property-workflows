-- Помічники для списку шаблонів і редактора: кількість версій кожного шаблону й ознака неопублікованих змін.

create function public.template_version_counts()
returns table (template_id uuid, versions integer)
language sql
stable
security definer
as $$
  select v.template_id, count(*)::integer
  from public.template_versions v
  group by v.template_id
$$;

grant execute on function public.template_version_counts() to authenticated;

create function private.template_has_unpublished(p_template_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select private.current_app_role()) is distinct from 'admin' then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  return coalesce(
    (select t.has_unpublished_changes from public.templates t where t.id = p_template_id),
    false
  );
end;
$$;

revoke execute on function private.template_has_unpublished(uuid) from public, anon;
grant execute on function private.template_has_unpublished(uuid) to authenticated;
