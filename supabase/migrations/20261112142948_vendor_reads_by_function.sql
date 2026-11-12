-- Вендор читає запуски й задачі лише через функції з білим списком колонок (AC-VENDOR-03, AC-VENDOR-04, AC-VENDOR-06).
--
-- Дефект (знахідка куратора WS9): RLS фільтрує рядки, а не колонки. Політика runs_select_visible пускала вендора до
-- рядка runs цілком (template_name, template_version_id, template_id, run_manager_id), а run_tasks — разом із done_by
-- (id того, хто позначив задачу). Сторінка лише ховала ці поля; прямий GET /rest/v1/runs?select=* з токеном вендора
-- їх віддавав. Grant на колонки ролі застосунку не розрізнить: усі ввійшлі — одна роль Postgres authenticated.
--
-- Рішення (ADR 0008): вендора прибрано з SELECT-політик runs і run_tasks (прямий select * — 0 рядків), а дозволене він
-- отримує з private.vendor_runs() і private.vendor_tasks(uuid). Вони security definer, тож оминають RLS: рядки
-- фільтруються в них самих — лише для ролі vendor і лише запуски/задачі, де він виконавець.

-- ── 1. Таблиці закрито для вендора; інші ролі — як раніше (private.can_see_run) ─────────────────────────────────
drop policy runs_select_visible on public.runs;
create policy runs_select_visible on public.runs for select to authenticated
  using (
    (select private.current_app_role()) <> 'vendor'
    and private.can_see_run(id)
  );

drop policy run_tasks_select_visible on public.run_tasks;
create policy run_tasks_select_visible on public.run_tasks for select to authenticated
  using (
    (select private.current_app_role()) <> 'vendor'
    and private.can_see_run(run_id)
  );

-- ── 2. Запуски вендора: лише id, назва випадку й статус запуску (AC-VENDOR-03, AC-VENDOR-06) ─────────────────────
-- Без шаблону, версії, менеджера запуску й часу запуску; порядок — новіші вище (як у списку запусків).
create function private.vendor_runs()
returns table (id uuid, case_name text, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.case_name, r.status
  from public.runs as r
  where (select private.current_app_role()) = 'vendor'
    and exists (
      select 1 from public.run_tasks as t
      where t.run_id = r.id and t.assignee_id = (select auth.uid())
    )
  order by r.created_at desc, r.id;
$$;
revoke execute on function private.vendor_runs() from public, anon;
grant execute on function private.vendor_runs() to authenticated;

create function public.vendor_runs()
returns table (id uuid, case_name text, status text)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.vendor_runs();
$$;
revoke execute on function public.vendor_runs() from public, anon;
grant execute on function public.vendor_runs() to authenticated;

-- ── 3. Задачі вендора: лише свої і лише назва, розділ, required/optional, позиція й статус (AC-VENDOR-04) ─────────
-- p_run_id = null — усі свої задачі (для «Your tasks: N of K done» у списку). Без assignee_id, done_by і done_at.
create function private.vendor_tasks(p_run_id uuid default null)
returns table (id uuid, run_id uuid, section_name text, name text, is_required boolean, "position" integer, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.run_id, t.section_name, t.name, t.is_required, t.position, t.status
  from public.run_tasks as t
  where (select private.current_app_role()) = 'vendor'
    and t.assignee_id = (select auth.uid())
    and (p_run_id is null or t.run_id = p_run_id)
  order by t.run_id, t.position;
$$;
revoke execute on function private.vendor_tasks(uuid) from public, anon;
grant execute on function private.vendor_tasks(uuid) to authenticated;

create function public.vendor_tasks(p_run_id uuid default null)
returns table (id uuid, run_id uuid, section_name text, name text, is_required boolean, "position" integer, status text)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.vendor_tasks(p_run_id);
$$;
revoke execute on function public.vendor_tasks(uuid) from public, anon;
grant execute on function public.vendor_tasks(uuid) to authenticated;
