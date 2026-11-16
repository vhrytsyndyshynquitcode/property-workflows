-- Зріз 4 «Parse a document» (openspec/specs/doc-parsing, ADR 0009): записи значень, які підтвердила людина.
-- Модель нічого не пише в базу: запис робить лише public.save_doc_record після «Save values» (AC-DOCAI-04).
-- Вставлений текст і відповідь моделі не зберігаємо (Non-goals PM). Блок і записи — лише менеджер запуску й
-- адміністратор (AC-DOCAI-14, AC-DOCAI-15); прямий запит без прав — NOT_ALLOWED, нічого не збережено (AC-DOCAI-16).

-- ── 1. Хто може розбирати документи запуску: адміністратор або менеджер запуску ─────────────────────────────────
create function private.can_parse_documents(p_run_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case (select private.current_app_role())
    when 'admin' then exists (select 1 from public.runs r where r.id = p_run_id)
    when 'manager' then exists (select 1 from public.runs r where r.id = p_run_id and r.run_manager_id = (select auth.uid()))
    else false
  end;
$$;
revoke execute on function private.can_parse_documents(uuid) from public, anon;
grant execute on function private.can_parse_documents(uuid) to authenticated;

create function public.can_parse_documents(p_run_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.can_parse_documents(p_run_id);
$$;
revoke execute on function public.can_parse_documents(uuid) from public, anon;
grant execute on function public.can_parse_documents(uuid) to authenticated;

-- ── 2. Записи документів запуску ────────────────────────────────────────────────────────────────────────────────
create table public.doc_records (
  id                 uuid primary key default gen_random_uuid(),
  run_id             uuid not null references public.runs (id) on delete cascade,
  document_type      text not null check (document_type in ('maintenance_request', 'estimate')),
  "values"           jsonb not null check (jsonb_typeof("values") = 'object'),
  confirmed_by       uuid not null references public.profiles (id),
  confirmed_by_email text not null,
  confirmed_at       timestamptz not null default now()
);
create index doc_records_run_id_idx on public.doc_records (run_id, confirmed_at desc);

alter table public.doc_records enable row level security;
revoke all on public.doc_records from anon, authenticated;
grant select on public.doc_records to authenticated;
-- Серверні скрипти й прибирання UAT (секретний ключ) — як для інших таблиць.
grant select, insert, update, delete on public.doc_records to service_role;

-- Читають ті самі ролі, що бачать блок; писати напряму не може ніхто з ролей застосунку (лише функція нижче).
create policy doc_records_select_run_manager_or_admin on public.doc_records for select to authenticated
  using (private.can_parse_documents(run_id));

-- ── 3. «Save values»: перевірка прав і запис однією функцією ───────────────────────────────────────────────────
create function private.save_doc_record(p_run_id uuid, p_document_type text, p_values jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_email text;
  v_id    uuid;
begin
  if v_uid is null or not private.can_parse_documents(p_run_id) then
    raise exception 'NOT_ALLOWED';
  end if;
  if p_document_type not in ('maintenance_request', 'estimate') or jsonb_typeof(p_values) is distinct from 'object' then
    raise exception 'INVALID_VALUES';
  end if;
  select p.email into v_email from public.profiles p where p.id = v_uid;
  insert into public.doc_records (run_id, document_type, "values", confirmed_by, confirmed_by_email)
  values (p_run_id, p_document_type, p_values, v_uid, coalesce(v_email, ''))
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function private.save_doc_record(uuid, text, jsonb) from public, anon;
grant execute on function private.save_doc_record(uuid, text, jsonb) to authenticated;

create function public.save_doc_record(p_run_id uuid, p_document_type text, p_values jsonb)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.save_doc_record(p_run_id, p_document_type, p_values);
$$;
revoke execute on function public.save_doc_record(uuid, text, jsonb) from public, anon;
grant execute on function public.save_doc_record(uuid, text, jsonb) to authenticated;
