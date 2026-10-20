-- Зріз workflow-runs: ролі manager/admin, шаблони, запуски, задачі запуску.
-- AC: AC-RUN-01..09, AC-TASK-01..09 (openspec/specs/run-launch, openspec/specs/task-completion).
-- Правила: RLS на кожній таблиці; revoke all + явні grant; політика на кожну операцію to authenticated;
-- (select auth.uid()); security definer — лише в private з set search_path = ''.
-- Запуск (запуск + копія задач) і позначення (задача + статус запуску) — функції Postgres через rpc:
-- у supabase-js немає транзакцій.

-- ── 1. Ролі: member → manager (порядок: старий check → дані → default → новий check) ──
alter table public.profiles drop constraint profiles_role_check;
update public.profiles set role = 'manager' where role = 'member';
alter table public.profiles alter column role set default 'manager';
alter table public.profiles
  add constraint profiles_role_check check (role in ('manager', 'admin'));

-- Призначати виконавців може менеджер запуску (AC-RUN-04): йому потрібен список менеджерів і адміністраторів
-- (лише id, ім'я, email, роль). Профілі інших користувачів менеджер не бачить (матриця прав), тому — функція
-- security definer у private (читає profiles в обхід RLS) і обгортка security invoker у public для rpc.
-- Робоче припущення про набір полів — до відповіді PM (solomchaak/property-workflows-spec#5).
create or replace function private.list_assignable_users()
returns table (id uuid, full_name text, email text, role text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name, p.email, p.role
  from public.profiles as p
  where (select private.current_app_role()) in ('manager', 'admin')
    and p.role in ('manager', 'admin')
  order by p.full_name nulls last, p.email;
$$;
revoke execute on function private.list_assignable_users() from public, anon;
grant execute on function private.list_assignable_users() to authenticated;

create or replace function public.list_assignable_users()
returns table (id uuid, full_name text, email text, role text)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.list_assignable_users();
$$;
revoke execute on function public.list_assignable_users() from public, anon;
grant execute on function public.list_assignable_users() to authenticated;

-- ── 2. Шаблони (готує адміністратор; у зрізі — сидом) ───────────────────────
create table public.templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null default now()
);

create table public.template_sections (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates (id) on delete cascade,
  name        text not null,
  position    integer not null default 0
);

create table public.template_tasks (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates (id) on delete cascade,
  section_id  uuid not null references public.template_sections (id) on delete cascade,
  name        text not null check (length(btrim(name)) > 0),
  is_required boolean not null default false,
  position    integer not null default 0
);
create index template_tasks_template_id_idx on public.template_tasks (template_id);

-- ── 3. Запуски і задачі запуску (знімок шаблону на момент запуску, AC-RUN-02) ──
create table public.runs (
  id             uuid primary key default gen_random_uuid(),
  template_id    uuid references public.templates (id) on delete set null,
  template_name  text not null,
  case_name      text not null check (length(btrim(case_name)) between 1 and 100),
  run_manager_id uuid not null references public.profiles (id),
  status         text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  created_at     timestamptz not null default now(),
  completed_at   timestamptz
);
create index runs_run_manager_id_idx on public.runs (run_manager_id);

create table public.run_tasks (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid not null references public.runs (id) on delete cascade,
  section_name text not null,
  name         text not null,
  is_required  boolean not null,
  position     integer not null,
  assignee_id  uuid not null references public.profiles (id),
  status       text not null default 'to_do' check (status in ('to_do', 'done')),
  done_at      timestamptz,
  done_by      uuid references public.profiles (id)
);
create index run_tasks_run_id_idx on public.run_tasks (run_id);
create index run_tasks_assignee_id_idx on public.run_tasks (assignee_id);

alter table public.templates enable row level security;
alter table public.template_sections enable row level security;
alter table public.template_tasks enable row level security;
alter table public.runs enable row level security;
alter table public.run_tasks enable row level security;

revoke all on table public.templates, public.template_sections, public.template_tasks,
  public.runs, public.run_tasks from anon, authenticated;

-- Шаблони: читають усі авторизовані; змінює лише адміністратор.
grant select, insert, update, delete on table public.templates, public.template_sections,
  public.template_tasks to authenticated;
-- Запуски й задачі: лише читання; створення й позначення — тільки функціями нижче.
grant select on table public.runs, public.run_tasks to authenticated;
grant select, insert, update, delete on table public.templates, public.template_sections,
  public.template_tasks, public.runs, public.run_tasks to service_role;

-- ── 4. Хелпер видимості запуску (security definer: run_tasks ↔ runs без рекурсії RLS) ──
create or replace function private.can_see_run(p_run_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.current_app_role()) = 'admin'
    or exists (select 1 from public.runs r
               where r.id = p_run_id and r.run_manager_id = (select auth.uid()))
    or exists (select 1 from public.run_tasks t
               where t.run_id = p_run_id and t.assignee_id = (select auth.uid()));
$$;
revoke execute on function private.can_see_run(uuid) from public, anon;
grant execute on function private.can_see_run(uuid) to authenticated;

-- ── 5. Політики ─────────────────────────────────────────────────────────────
create policy templates_select on public.templates for select to authenticated using (true);
create policy templates_insert_admin on public.templates for insert to authenticated
  with check ((select private.current_app_role()) = 'admin');
create policy templates_update_admin on public.templates for update to authenticated
  using ((select private.current_app_role()) = 'admin')
  with check ((select private.current_app_role()) = 'admin');
create policy templates_delete_admin on public.templates for delete to authenticated
  using ((select private.current_app_role()) = 'admin');

create policy template_sections_select on public.template_sections for select to authenticated using (true);
create policy template_sections_insert_admin on public.template_sections for insert to authenticated
  with check ((select private.current_app_role()) = 'admin');
create policy template_sections_update_admin on public.template_sections for update to authenticated
  using ((select private.current_app_role()) = 'admin')
  with check ((select private.current_app_role()) = 'admin');
create policy template_sections_delete_admin on public.template_sections for delete to authenticated
  using ((select private.current_app_role()) = 'admin');

create policy template_tasks_select on public.template_tasks for select to authenticated using (true);
create policy template_tasks_insert_admin on public.template_tasks for insert to authenticated
  with check ((select private.current_app_role()) = 'admin');
create policy template_tasks_update_admin on public.template_tasks for update to authenticated
  using ((select private.current_app_role()) = 'admin')
  with check ((select private.current_app_role()) = 'admin');
create policy template_tasks_delete_admin on public.template_tasks for delete to authenticated
  using ((select private.current_app_role()) = 'admin');

-- AC-TASK-06: менеджер бачить лише запуски, де він менеджер запуску або виконавець; адміністратор — усі.
create policy runs_select_visible on public.runs for select to authenticated
  using (private.can_see_run(id));
-- Виконавець бачить статуси всіх задач запуску (припущення PM).
create policy run_tasks_select_visible on public.run_tasks for select to authenticated
  using (private.can_see_run(run_id));

-- ── 6. Запуск шаблону (AC-RUN-01..09): запуск + копія задач однією транзакцією ──
-- Помилки — коди в message, тексти для людини — у застосунку (src/lib/runs/messages.ts).
create or replace function private.launch_run(p_template_id uuid, p_case_name text, p_assignments jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_role text := (select private.current_app_role());
  v_case text := btrim(coalesce(p_case_name, ''));
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

create or replace function public.launch_run(p_template_id uuid, p_case_name text, p_assignments jsonb default '{}'::jsonb)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.launch_run(p_template_id, p_case_name, p_assignments);
$$;
revoke execute on function public.launch_run(uuid, text, jsonb) from public, anon;
grant execute on function public.launch_run(uuid, text, jsonb) to authenticated;

-- ── 7. Позначення задачі виконаною (AC-TASK-01..04, AC-TASK-07) ──────────────
create or replace function private.mark_task_done(p_task_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_role text := (select private.current_app_role());
  v_task public.run_tasks%rowtype;
  v_run public.runs%rowtype;
begin
  select * into v_task from public.run_tasks where id = p_task_id for update;
  if v_task.id is null then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  select * into v_run from public.runs where id = v_task.run_id for update;

  if v_uid is null or not (
    v_role = 'admin' or v_task.assignee_id = v_uid or v_run.run_manager_id = v_uid
  ) then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;

  -- Повторна позначка нічого не змінює (припущення PM).
  if v_task.status = 'done' then
    return v_run.status;
  end if;

  update public.run_tasks set status = 'done', done_at = now(), done_by = v_uid where id = p_task_id;

  if v_run.status = 'in_progress' and not exists (
    select 1 from public.run_tasks
    where run_id = v_run.id and is_required and status <> 'done'
  ) then
    update public.runs set status = 'completed', completed_at = now() where id = v_run.id;
    return 'completed';
  end if;

  return v_run.status;
end;
$$;
revoke execute on function private.mark_task_done(uuid) from public, anon;
grant execute on function private.mark_task_done(uuid) to authenticated;

create or replace function public.mark_task_done(p_task_id uuid)
returns text
language sql
security invoker
set search_path = ''
as $$
  select private.mark_task_done(p_task_id);
$$;
revoke execute on function public.mark_task_done(uuid) from public, anon;
grant execute on function public.mark_task_done(uuid) to authenticated;

-- ── 8. Довідкові дані: шаблон «Tenant move-in» (2 розділи, 5 задач, 3 обов'язкові) ──
insert into public.templates (id, name)
values ('00000000-0000-4000-8000-000000000001', 'Tenant move-in')
on conflict (id) do nothing;

insert into public.template_sections (id, template_id, name, position) values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'Before move-in', 1),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', 'Move-in day', 2)
on conflict (id) do nothing;

insert into public.template_tasks (id, template_id, section_id, name, is_required, position) values
  ('00000000-0000-4000-8000-000000001001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'Sign the lease', true, 1),
  ('00000000-0000-4000-8000-000000001002', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'Collect the deposit', true, 2),
  ('00000000-0000-4000-8000-000000001003', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'Order cleaning', false, 3),
  ('00000000-0000-4000-8000-000000001004', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000102', 'Hand over the keys', true, 1),
  ('00000000-0000-4000-8000-000000001005', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000102', 'Record meter readings', false, 2)
on conflict (id) do nothing;
