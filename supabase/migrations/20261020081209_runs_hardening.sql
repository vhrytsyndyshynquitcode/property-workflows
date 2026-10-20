-- Зріз workflow-runs, уточнення після рев'ю PR #6 (AC-RUN-03, AC-RUN-07, AC-RUN-01).
-- 1) Назва випадку: обрізаємо всі пробільні символи (пробіл, таб, переноси, нерозривний пробіл), як String.trim()
--    у validateCaseName (src/lib/runs/domain.ts); довжину рахуємо в символах (Postgres length() — символи).
-- 2) Індекси на FK шаблонів: launch_run з'єднує template_tasks з template_sections, каскадне видалення шаблону.
-- Застосовану міграцію 20261020073540 не редагуємо — функцію перевизначаємо тут.

create index if not exists template_sections_template_id_idx on public.template_sections (template_id);
create index if not exists template_tasks_section_id_idx on public.template_tasks (section_id);

-- Помилки — коди в message (CASE_NAME_EMPTY, CASE_NAME_TOO_LONG, NOT_ALLOWED, TEMPLATE_NOT_FOUND, INVALID_ASSIGNEE),
-- тексти для людини — у застосунку (src/lib/runs/domain.ts, ERROR_MESSAGES).
create or replace function private.launch_run(p_template_id uuid, p_case_name text, p_assignments jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_role text := (select private.current_app_role());
  v_case text := regexp_replace(coalesce(p_case_name, ''), '^[\s ﻿]+|[\s ﻿]+$', '', 'g');
  v_template_name text;
  v_run_id uuid;
begin
  if v_uid is null or v_role is null or v_role not in ('manager', 'admin') then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  if length(v_case) = 0 then
    raise exception 'CASE_NAME_EMPTY' using errcode = '22023';
  end if;
  if length(v_case) > 100 then
    raise exception 'CASE_NAME_TOO_LONG' using errcode = '22023';
  end if;

  select t.name into v_template_name from public.templates as t where t.id = p_template_id;
  if v_template_name is null then
    raise exception 'TEMPLATE_NOT_FOUND' using errcode = '22023';
  end if;

  -- Виконавець — лише менеджер або адміністратор (Поза межами: підрядників немає).
  if exists (
    select 1
    from jsonb_each_text(coalesce(p_assignments, '{}'::jsonb)) as a(task_id, assignee_id)
    left join public.profiles as p on p.id = a.assignee_id::uuid
    where p.id is null or p.role not in ('manager', 'admin')
  ) then
    raise exception 'INVALID_ASSIGNEE' using errcode = '22023';
  end if;

  insert into public.runs (template_id, template_name, case_name, run_manager_id)
  values (p_template_id, v_template_name, v_case, v_uid)
  returning id into v_run_id;

  -- Знімок задач шаблону; без призначення виконавець — менеджер запуску (AC-RUN-08, AC-RUN-09).
  insert into public.run_tasks (run_id, section_name, name, is_required, position, assignee_id)
  select v_run_id, s.name, tt.name, tt.is_required,
         row_number() over (order by s.position, tt.position, tt.id),
         coalesce((p_assignments ->> tt.id::text)::uuid, v_uid)
  from public.template_tasks as tt
  join public.template_sections as s on s.id = tt.section_id
  where tt.template_id = p_template_id;

  return v_run_id;
end;
$$;
revoke execute on function private.launch_run(uuid, text, jsonb) from public, anon;
grant execute on function private.launch_run(uuid, text, jsonb) to authenticated;
