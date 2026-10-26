-- Зріз 2: редактор шаблонів з версіями (openspec/specs/template-editor, AC-EDITOR-01..09).
-- Робоча копія (неопубліковані зміни) — наявні template_sections / template_tasks, бачить і змінює лише admin.
-- Версії — незмінні таблиці template_versions / version_sections / version_tasks; зберігає лише функція бази.
-- Правила: RLS на кожній таблиці; revoke all + явні grant; окрема політика на кожну операцію to authenticated;
-- column grants; security definer — лише в private з set search_path = ''. anon не отримує жодного grant.

-- ── 1. Нові таблиці версій ──────────────────────────────────────────────────
create table public.template_versions (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates (id) on delete cascade,
  number      integer not null check (number > 0),
  created_at  timestamptz not null default now(),
  created_by  uuid references public.profiles (id),
  constraint template_versions_number_key unique (template_id, number)
);

create table public.version_sections (
  id         uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.template_versions (id) on delete cascade,
  name       text not null,
  position   integer not null
);
create index version_sections_version_id_idx on public.version_sections (version_id);

create table public.version_tasks (
  id          uuid primary key default gen_random_uuid(),
  version_id  uuid not null references public.template_versions (id) on delete cascade,
  section_id  uuid not null references public.version_sections (id) on delete cascade,
  name        text not null,
  is_required boolean not null,
  position    integer not null
);
create index version_tasks_version_id_idx on public.version_tasks (version_id);

alter table public.templates
  add column current_version_id uuid references public.template_versions (id),
  add column has_unpublished_changes boolean not null default true;
alter table public.runs
  add column template_version_id uuid references public.template_versions (id);
create index runs_template_version_id_idx on public.runs (template_version_id);

alter table public.template_versions enable row level security;
alter table public.version_sections enable row level security;
alter table public.version_tasks enable row level security;

-- ── 2. GRANT: версії лише читаються; шаблони й робоча копія — column grants ──
revoke all on table public.template_versions, public.version_sections, public.version_tasks from anon, authenticated;
grant select on table public.template_versions, public.version_sections, public.version_tasks to authenticated;
grant select, insert, update, delete on table public.template_versions, public.version_sections,
  public.version_tasks to service_role;

-- Шаблон: адміністратор створює й перейменовує; поточну версію й позначку змінює лише функція бази (AC-EDITOR-03).
-- Видалення шаблону — поза зрізом, тож delete не даємо.
revoke all on table public.templates from anon, authenticated;
grant select, insert (name) on table public.templates to authenticated;
grant update (name) on table public.templates to authenticated;
-- Робоча копія: задачу не переносимо в інший шаблон (template_id без update).
revoke all on table public.template_sections, public.template_tasks from anon, authenticated;
grant select, insert, delete on table public.template_sections, public.template_tasks to authenticated;
grant update (name, position) on table public.template_sections to authenticated;
grant update (name, position, is_required, section_id) on table public.template_tasks to authenticated;

-- ── 3. Хелпер: поточна версія шаблону, видима менеджеру ─────────────────────
create or replace function private.is_current_version(p_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.templates t where t.current_version_id = p_version_id);
$$;
revoke execute on function private.is_current_version(uuid) from public, anon;
grant execute on function private.is_current_version(uuid) to authenticated;

-- Версія видимого запуску (AC-EDITOR-06: менеджер бачить версію своїх запусків, навіть не поточну).
create or replace function private.is_version_of_visible_run(p_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.runs r
    where r.template_version_id = p_version_id and private.can_see_run(r.id)
  );
$$;
revoke execute on function private.is_version_of_visible_run(uuid) from public, anon;
grant execute on function private.is_version_of_visible_run(uuid) to authenticated;

-- ── 4. Політики (окремо на кожну операцію) ───────────────────────────────────
-- Шаблони: admin — усі; manager — лише збережені як версія (AC-EDITOR-02).
drop policy templates_select on public.templates;
create policy templates_select_admin_or_published on public.templates for select to authenticated
  using ((select private.current_app_role()) = 'admin' or current_version_id is not null);
-- templates_insert_admin, templates_update_admin, templates_delete_admin зрізу 1 лишаються (delete без grant).

-- Робоча копія — лише admin (AC-EDITOR-02: менеджер не бачить неопублікованих змін; AC-EDITOR-08: не змінює).
drop policy template_sections_select on public.template_sections;
create policy template_sections_select_admin on public.template_sections for select to authenticated
  using ((select private.current_app_role()) = 'admin');
drop policy template_tasks_select on public.template_tasks;
create policy template_tasks_select_admin on public.template_tasks for select to authenticated
  using (true);
-- insert / update / delete робочої копії — політики *_admin зрізу 1 (лише admin) лишаються.

create policy template_versions_select on public.template_versions for select to authenticated
  using (
    (select private.current_app_role()) = 'admin'
    or private.is_current_version(id)
    or private.is_version_of_visible_run(id)
  );
create policy version_sections_select on public.version_sections for select to authenticated
  using (
    (select private.current_app_role()) = 'admin'
    or private.is_current_version(version_id)
    or private.is_version_of_visible_run(version_id)
  );
create policy version_tasks_select on public.version_tasks for select to authenticated
  using (
    (select private.current_app_role()) = 'admin'
    or private.is_current_version(version_id)
    or private.is_version_of_visible_run(version_id)
  );

-- ── 5. Позначка «Unpublished changes» (AC-EDITOR-01) ───────────────────────
create or replace function private.mark_template_unpublished()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.templates
  set has_unpublished_changes = true
  where id = coalesce(new.template_id, old.template_id);
  return null;
end;
$$;
revoke execute on function private.mark_template_unpublished() from public, anon, authenticated;

create trigger template_sections_mark_unpublished
  after insert or update or delete on public.template_sections
  for each row execute function private.mark_template_unpublished();
create trigger template_tasks_mark_unpublished
  after insert or update or delete on public.template_tasks
  for each row execute function private.mark_template_unpublished();

-- ── 6. Збереження версії (AC-EDITOR-03, AC-EDITOR-04, AC-EDITOR-08) ─────────
-- Помилки — коди в message (NOT_ALLOWED, TEMPLATE_NOT_FOUND, NO_REQUIRED_TASK); тексти — у src/lib/templates.
create or replace function private.save_template_version(p_template_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_number integer;
  v_version_id uuid;
begin
  if (select private.current_app_role()) is distinct from 'admin' then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  perform 1 from public.templates where id = p_template_id for update;
  if not found then
    raise exception 'TEMPLATE_NOT_FOUND' using errcode = '22023';
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

-- Копія робочої копії у версію: розділи й задачі з порядком.
create or replace function private.copy_draft_to_version(p_template_id uuid, p_version_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  v_section_id uuid;
begin
  for s in
    select id, name, position from public.template_sections
    where template_id = p_template_id order by position, id
  loop
    insert into public.version_sections (version_id, name, position)
    values (p_version_id, s.name, s.position)
    returning id into v_section_id;

    insert into public.version_tasks (version_id, section_id, name, is_required, position)
    select p_version_id, v_section_id, t.name, t.is_required, t.position
    from public.template_tasks t
    where t.section_id = s.id;
  end loop;
end;
$$;
revoke execute on function private.copy_draft_to_version(uuid, uuid) from public, anon, authenticated;
revoke execute on function private.save_template_version(uuid) from public, anon;
grant execute on function private.save_template_version(uuid) to authenticated;

create or replace function public.save_template_version(p_template_id uuid)
returns integer
language sql
security invoker
set search_path = ''
as $$
  select private.save_template_version(p_template_id);
$$;
revoke execute on function public.save_template_version(uuid) from public, anon;
grant execute on function public.save_template_version(uuid) to authenticated;

-- ── 7. Запуск з поточної версії (AC-EDITOR-06; AC-RUN-01..12 без змін поведінки) ─
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

  if exists (
    select 1
    from jsonb_each_text(coalesce(p_assignments, '{}'::jsonb)) as a(task_id, assignee_id)
    left join public.profiles as p on p.id = a.assignee_id::uuid
    where p.id is null or p.role not in ('manager', 'admin')
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

-- ── 8. Перехід від зрізу 1 (solomchaak/property-workflows-spec#33, робоче припущення A) ─
-- Кожен наявний шаблон стає версією 1 (автор — перший admin, якщо він є); наявні запуски — з версії 1.
do $$
declare
  r record;
  v_version_id uuid;
  v_admin uuid := (select p.id from public.profiles p where p.role = 'admin' order by p.created_at limit 1);
begin
  for r in select id from public.templates where current_version_id is null loop
    insert into public.template_versions (template_id, number, created_by)
    values (r.id, 1, v_admin)
    returning id into v_version_id;
    perform private.copy_draft_to_version(r.id, v_version_id);
    update public.templates set current_version_id = v_version_id, has_unpublished_changes = false where id = r.id;
    update public.runs set template_version_id = v_version_id where template_id = r.id and template_version_id is null;
  end loop;
end;
$$;
