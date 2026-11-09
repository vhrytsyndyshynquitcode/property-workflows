-- Зріз 3: роль вендора (openspec/specs/vendor-access; requirements/39-assign-a-vendor.md).
--   AC-VENDOR-01 — вендор може бути виконавцем задач запуску;
--   AC-VENDOR-02 — менеджер бачить email вендорів у виборі виконавця;
--   AC-VENDOR-03, AC-VENDOR-04, AC-VENDOR-06 — вендор бачить лише запуски, де він виконавець, і в них лише свої задачі;
--   AC-VENDOR-08 — вендор не бачить шаблонів і версій;
--   AC-VENDOR-09 — вендор не запускає шаблони (launch_run і далі пускає лише manager / admin);
--   AC-VENDOR-05, AC-VENDOR-07 — mark_task_done без змін: вендор позначає лише задачу, де він виконавець.
-- Застосовані міграції не редагуємо: функції й політики перевизначаємо тут; права, обгортки public і grants — ті самі.

-- ── 1. Набір ролей (порядок — з заголовка 20261012000000_profiles_and_roles.sql) ────────────────────────────────
-- 1) зняти старий check; 2) наявні дані не змінюються (manager, admin лишаються); 3) default лишається 'manager';
-- 4) новий check з vendor. Роль ставить лише service_role (column grant update (full_name) зрізу 1 без змін).
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles alter column role set default 'manager';
alter table public.profiles
  add constraint profiles_role_check check (role in ('manager', 'admin', 'vendor'));

-- ── 2. Вибір виконавця: менеджери, адміністратори й вендори (AC-VENDOR-02) ─────────────────────────────────────
-- Бачать список лише manager і admin: вендор не бачить email інших користувачів (матриця прав).
create or replace function private.list_assignable_users()
returns table (id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.email
  from public.profiles as p
  where (select private.current_app_role()) in ('manager', 'admin')
    and p.role in ('manager', 'admin', 'vendor')
  order by p.email;
$$;
revoke execute on function private.list_assignable_users() from public, anon;
grant execute on function private.list_assignable_users() to authenticated;

-- ── 3. Запуск: вендор може бути виконавцем (AC-VENDOR-01), але не запускає (AC-VENDOR-09) ────────────────────────
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
  v_version_id uuid;
  v_run_id uuid;
begin
  -- AC-VENDOR-09: запускає лише менеджер чи адміністратор; вендор менеджером запуску не стає.
  if v_uid is null or v_role is null or v_role not in ('manager', 'admin') then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  if length(v_case) = 0 then
    raise exception 'CASE_NAME_EMPTY' using errcode = '22023';
  end if;
  if length(v_case) > 100 then
    raise exception 'CASE_NAME_TOO_LONG' using errcode = '22023';
  end if;

  -- Запускаємо лише збережену поточну версію; неопубліковані зміни — ніколи.
  select t.name, t.current_version_id into v_template_name, v_version_id
  from public.templates as t where t.id = p_template_id;
  if v_template_name is null or v_version_id is null then
    raise exception 'TEMPLATE_NOT_FOUND' using errcode = '22023';
  end if;

  -- AC-VENDOR-01: виконавцем може бути менеджер, адміністратор або вендор.
  if exists (
    select 1
    from jsonb_each_text(coalesce(p_assignments, '{}'::jsonb)) as a(task_id, assignee_id)
    left join public.profiles as p on p.id = a.assignee_id::uuid
    where p.id is null or p.role not in ('manager', 'admin', 'vendor')
  ) then
    raise exception 'INVALID_ASSIGNEE' using errcode = '22023';
  end if;

  insert into public.runs (template_id, template_version_id, template_name, case_name, run_manager_id)
  values (p_template_id, v_version_id, v_template_name, v_case, v_uid)
  returning id into v_run_id;

  insert into public.run_tasks (run_id, section_name, name, is_required, position, assignee_id)
  select v_run_id, s.name, vt.name, vt.is_required,
         row_number() over (order by s.position, vt.position, vt.id),
         coalesce((p_assignments ->> vt.id::text)::uuid, v_uid)
  from public.version_tasks as vt
  join public.version_sections as s on s.id = vt.section_id
  where vt.version_id = v_version_id;

  return v_run_id;
end;
$$;
revoke execute on function private.launch_run(uuid, text, jsonb) from public, anon;
grant execute on function private.launch_run(uuid, text, jsonb) to authenticated;

-- ── 4. Задачі запуску: вендор бачить лише свої (AC-VENDOR-03, AC-VENDOR-04, AC-VENDOR-06) ──────────────────────
-- Інші ролі — як раніше (private.can_see_run). Запуск без жодної задачі вендора він не бачить: can_see_run пускає
-- лише виконавця, а менеджером запуску вендор не стає.
drop policy run_tasks_select_visible on public.run_tasks;
create policy run_tasks_select_visible on public.run_tasks for select to authenticated
  using (
    private.can_see_run(run_id)
    and ((select private.current_app_role()) <> 'vendor' or assignee_id = (select auth.uid()))
  );

-- ── 5. Шаблони й версії закриті для вендора (AC-VENDOR-08) ─────────────────────────────────────────────────────
drop policy templates_select_admin_or_published on public.templates;
create policy templates_select_admin_or_published on public.templates for select to authenticated
  using (
    (select private.current_app_role()) = 'admin'
    or ((select private.current_app_role()) = 'manager' and current_version_id is not null)
  );

drop policy template_versions_select on public.template_versions;
create policy template_versions_select on public.template_versions for select to authenticated
  using (
    (select private.current_app_role()) = 'admin'
    or (
      (select private.current_app_role()) = 'manager'
      and (private.is_current_version(id) or private.is_version_of_visible_run(id))
    )
  );
drop policy version_sections_select on public.version_sections;
create policy version_sections_select on public.version_sections for select to authenticated
  using (
    (select private.current_app_role()) = 'admin'
    or (
      (select private.current_app_role()) = 'manager'
      and (private.is_current_version(version_id) or private.is_version_of_visible_run(version_id))
    )
  );
drop policy version_tasks_select on public.version_tasks;
create policy version_tasks_select on public.version_tasks for select to authenticated
  using (
    (select private.current_app_role()) = 'admin'
    or (
      (select private.current_app_role()) = 'manager'
      and (private.is_current_version(version_id) or private.is_version_of_visible_run(version_id))
    )
  );

-- ── 6. Підтвердження останньої обов'язкової задачі й для вендора (припущення PM; AC-TASK-04, AC-VENDOR-05) ───────
-- Вендор бачить лише свої задачі, тож «остання обов'язкова задача запуску» сторінка порахувати не може: рахує база.
-- Відповідь — лише так / ні і лише тому, хто може позначити цю задачу (адміністратор, виконавець, менеджер запуску);
-- інші задачі запуску вендору не розкриваються.
create or replace function private.is_last_required_task(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select t.is_required
      and t.status = 'to_do'
      and not exists (
        select 1 from public.run_tasks o
        where o.run_id = t.run_id and o.id <> t.id and o.is_required and o.status <> 'done'
      )
    from public.run_tasks t
    join public.runs r on r.id = t.run_id
    where t.id = p_task_id
      and (
        (select private.current_app_role()) = 'admin'
        or t.assignee_id = (select auth.uid())
        or r.run_manager_id = (select auth.uid())
      )
  ), false);
$$;
revoke execute on function private.is_last_required_task(uuid) from public, anon;
grant execute on function private.is_last_required_task(uuid) to authenticated;

create or replace function public.is_last_required_task(p_task_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_last_required_task(p_task_id);
$$;
revoke execute on function public.is_last_required_task(uuid) from public, anon;
grant execute on function public.is_last_required_task(uuid) to authenticated;
