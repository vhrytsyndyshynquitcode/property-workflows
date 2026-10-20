# Design: workflow-runs

## Ролі

Нова міграція замінює ролі шаблону `member`/`admin` на `manager`/`admin` (матриця прав у `requirements/product.md`):
знімаємо `profiles_role_check` → `update … set role = 'manager' where role = 'member'` → default `manager` → новий
`profiles_role_check`. У `supabase/demo-users.json` — `admin@example.test` (`admin`), `manager1@example.test`,
`manager2@example.test`, `manager3@example.test` (`manager`): три менеджери потрібні для AC-TASK-03 (менеджери A, B, C).

## Таблиці

| Таблиця | Призначення | AC |
|---|---|---|
| `templates` | шаблон (назва) | AC-RUN-01 |
| `template_sections` | розділ шаблону (назва, порядок) | AC-RUN-01 |
| `template_tasks` | задача шаблону, `is_required` | AC-RUN-01, AC-TASK-04 |
| `runs` | запуск: `case_name` (1–100 після обрізання), `run_manager_id`, `status` `in_progress`/`completed`, назва шаблону на момент запуску | AC-RUN-01, AC-RUN-03, AC-RUN-05..07, AC-TASK-04 |
| `run_tasks` | копія задачі шаблону в запуску: назва, назва розділу, `is_required`, `assignee_id`, `status` `to_do`/`done` | AC-RUN-01, AC-RUN-02, AC-RUN-04, AC-RUN-08, AC-RUN-09, AC-TASK-01..08 |

Знімок шаблону (AC-RUN-02): запуск копіює задачі й назви розділів у `run_tasks` і не посилається на `template_tasks`,
тож зміни шаблону запуск не зачіпають.

## Права (GRANT + RLS)

- Усі таблиці: `enable row level security`, `revoke all … from anon, authenticated`, явні `grant`.
- Шаблони: `select` — усім авторизованим; `insert`/`update`/`delete` — політики лише для `admin` (матриця прав).
- `runs`, `run_tasks`: лише `select` для `authenticated`; політика через `private.can_see_run(run_id)`: адміністратор —
  усі запуски, менеджер — запуски, де він менеджер запуску або виконавець хоча б однієї задачі (AC-TASK-06); виконавець
  бачить усі задачі свого запуску (припущення PM).
- Записи в `runs`/`run_tasks` — лише функціями нижче (прямих `insert`/`update` для `authenticated` немає).

## Функції (rpc)

- `public.launch_run(p_template_id, p_case_name, p_assignments jsonb)` (`security invoker`) →
  `private.launch_run` (`security definer`, `set search_path = ''`): перевіряє роль, назву випадку
  (`CASE_NAME_EMPTY` — AC-RUN-03, `CASE_NAME_TOO_LONG` — AC-RUN-07), виконавців (лише `manager`/`admin`), створює запуск і
  копіює задачі однією транзакцією; виконавець без призначення — менеджер запуску (AC-RUN-04, AC-RUN-08, AC-RUN-09).
- `public.mark_task_done(p_task_id)` → `private.mark_task_done`: дозволено виконавцю, менеджеру запуску, адміністратору
  (AC-TASK-01, AC-TASK-02, AC-TASK-07), інакше `NOT_ALLOWED` (AC-TASK-03); повторна позначка нічого не змінює; коли всі
  обов'язкові задачі `done` — запуск `completed` (AC-TASK-04).
- `public.list_assignable_users()` (`security definer`): id, ім'я, email і роль менеджерів та адміністраторів — для
  вибору виконавців (AC-RUN-04) і показу виконавця задачі; інші поля профілів менеджер не бачить.

## Домен

`src/lib/runs/domain.ts` — ті самі правила чистими функціями: назва випадку, побудова запуску, право позначити,
статус запуску, прогрес «N of M done», видимість запусків, тексти повідомлень дослівно як у PM. Тести з AC ID — у
`tests/runs/*.test.ts`.

## Сторінки й server actions

| Шлях | Що | AC |
|---|---|---|
| `/runs` | список видимих запусків: випадок, шаблон, статус, прогрес | AC-TASK-06, AC-TASK-09 |
| `/runs/new` | вибір шаблону → назва випадку і виконавець для кожної задачі (за замовчуванням — «я») | AC-RUN-01, AC-RUN-03..09 |
| `/runs/[id]` | прогрес, задачі за розділами: назва, обов'язкова чи ні, виконавець, статус, кнопка «Mark as done» | AC-TASK-01..05, AC-TASK-07, AC-TASK-08 |

Server actions `launchRun` і `markTaskDone` (`src/app/runs/actions.ts`): перевіряють `getClaims()`, викликають rpc,
коди помилок бази перекладають у тексти PM (`messageForDbError`) і повертають їх через `searchParams`, як сторінка входу.

## Довідкові дані

Шаблон «Tenant move-in» (2 розділи, 5 задач, 3 обов'язкові) — у міграції `insert … on conflict do nothing`: сид у хмарі
вже виконано, і створення шаблонів в інтерфейсі поза зрізом.
