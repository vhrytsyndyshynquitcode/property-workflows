-- Уточнення PM 27.10 для редактора шаблонів (openspec/specs/template-editor):
--   AC-EDITOR-12 — збереження без неопублікованих змін не створює версію (NO_CHANGES);
--   AC-EDITOR-15 — розділ без задач не зберігається (EMPTY_SECTION);
--   AC-EDITOR-20 — шаблон, розділ і задача потребують назви, пробіли — порожньо (NAME_REQUIRED);
--   AC-EDITOR-23 — назва шаблону унікальна без урахування регістру й пробілів на початку та в кінці.
-- Застосовану міграцію 20261026084454 не редагуємо: функцію перевизначаємо тут; права, обгортка public і grants — ті самі.

-- AC-EDITOR-23: унікальна назва шаблону (регістр і крайові пробіли не враховуються).
create unique index templates_name_unique on public.templates (lower(btrim(name)));

create or replace function private.save_template_version(p_template_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_number integer;
  v_version_id uuid;
  v_has_changes boolean;
  v_name text;
begin
  if (select private.current_app_role()) is distinct from 'admin' then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  select has_unpublished_changes, name into v_has_changes, v_name
  from public.templates where id = p_template_id for update;
  if not found then
    raise exception 'TEMPLATE_NOT_FOUND' using errcode = '22023';
  end if;
  -- AC-EDITOR-12: без неопублікованих змін нової версії немає.
  if not v_has_changes then
    raise exception 'NO_CHANGES' using errcode = '22023';
  end if;
  -- AC-EDITOR-20: назва шаблону, кожного розділу й кожної задачі не порожня й не з самих пробілів.
  if btrim(v_name) = ''
     or exists (select 1 from public.template_sections where template_id = p_template_id and btrim(name) = '')
     or exists (select 1 from public.template_tasks where template_id = p_template_id and btrim(name) = '') then
    raise exception 'NAME_REQUIRED' using errcode = '22023';
  end if;
  -- AC-EDITOR-15: кожен розділ має хоча б одну задачу.
  if exists (
    select 1 from public.template_sections as s
    where s.template_id = p_template_id
      and not exists (select 1 from public.template_tasks as t where t.section_id = s.id)
  ) then
    raise exception 'EMPTY_SECTION' using errcode = '22023';
  end if;
  if not exists (select 1 from public.template_tasks where template_id = p_template_id and is_required) then
    raise exception 'NO_REQUIRED_TASK' using errcode = '22023';
  end if;

  select coalesce(max(number), 0) + 1 into v_number from public.template_versions where template_id = p_template_id;
  insert into public.template_versions (template_id, number, created_by)
  values (p_template_id, v_number, (select auth.uid()))
  returning id into v_version_id;

  perform private.copy_draft_to_version(p_template_id, v_version_id);

  update public.templates
  set current_version_id = v_version_id, has_unpublished_changes = false
  where id = p_template_id;
  return v_number;
end;
$$;

revoke execute on function private.save_template_version(uuid) from public, anon;
grant execute on function private.save_template_version(uuid) to authenticated;
