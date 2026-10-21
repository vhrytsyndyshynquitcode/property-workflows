-- Уточнення PM 2026-10-20 (solomchaak/property-workflows-spec#5): у виборі виконавця і біля задач менеджер бачить
-- лише email менеджерів і адміністраторів — без імен, ролей та інших даних профілів (AC-RUN-10, AC-TASK-11).
-- Тип результату змінюється, тож функції перестворюємо (create or replace не змінює returns table).

drop function if exists public.list_assignable_users();
drop function if exists private.list_assignable_users();

create function private.list_assignable_users()
returns table (id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.email
  from public.profiles as p
  where (select private.current_app_role()) in ('manager', 'admin')
    and p.role in ('manager', 'admin')
  order by p.email;
$$;
revoke execute on function private.list_assignable_users() from public, anon;
grant execute on function private.list_assignable_users() to authenticated;

create function public.list_assignable_users()
returns table (id uuid, email text)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.list_assignable_users();
$$;
revoke execute on function public.list_assignable_users() from public, anon;
grant execute on function public.list_assignable_users() to authenticated;
