# Design: vendor-access (зріз 3)

Нова роль `vendor` у `profiles.role`. Роль — лише з `public.profiles` (`private.current_app_role()`), ніколи з
`user_metadata` (AGENTS.md). Набір ролей змінюємо новою міграцією в порядку з заголовка
`20261012000000_profiles_and_roles.sql`: зняти `profiles_role_check` → дані не змінюємо (наявні ролі лишаються) →
`default` лишається `manager` → новий `profiles_role_check` з `vendor`. Вендора створює адміністратор (у навчальному
проєкті — `npm run users:demo`, `supabase/demo-users.json`): роль ставить `service_role`, сам користувач її не змінює
(column grant `update (full_name)` зрізу 1).

## UI і компоненти

Усі сторінки — у `AppShell` / `PageHeader` з `@/components/ui` (DESIGN.md), лише токени; тексти — дослівно з AC.

| Сторінка | Вендор бачить | Компоненти | Тексти | AC |
|---|---|---|---|---|
| навігація (`APP_NAV`) | лише «Runs» (без «Templates» і «Launch a template») | `NavLinks` | — (рішення до відповіді PM, solomchaak/property-workflows-spec#44) | — |
| `/runs` | лише запуски, де він виконавець: назва випадку, статус запуску (`StatusBadge`), «Your tasks: N of K done»; без колонки шаблону й без «Launch a template» | `Table`, `StatusBadge` | порожній стан — «No tasks assigned to you yet.» без таблиці | AC-VENDOR-03, AC-VENDOR-10 |
| `/runs/[id]` | заголовок — назва випадку; «Your tasks: N of K done»; лише свої задачі за розділами: назва, розділ, «required»/«optional», статус, «Mark as done»; без шаблону, версії, менеджера запуску, email, прогресу запуску й статусу запуску (до відповіді PM, solomchaak/property-workflows-spec#41) | `Card`, `StatusBadge`, `Button`, `Alert` | після позначки — «Your tasks: 1 of 2 done»; остання обов'язкова — підтвердження «This cannot be undone» (як AC-TASK-04) | AC-VENDOR-04, AC-VENDOR-05 |
| `/runs/[id]` (чужий запуск) | «Run not found», жодної задачі | `Alert` | «Run not found» | AC-VENDOR-06 |
| `/templates`, `/templates/[id]`, `/templates/new`, редактор, версії | «Not enough rights», жодного шаблону | `NotEnoughRights` | «Not enough rights» | AC-VENDOR-08 |
| `/runs/new` | «Not enough rights» і посилання до списку запусків, без форми (до відповіді PM, solomchaak/property-workflows-spec#47) | `Alert` | «Not enough rights» | AC-VENDOR-09 |
| вибір виконавця на `/runs/new` (менеджер, адміністратор) | email менеджерів, адміністраторів і вендорів, без імен і ролей | `NativeSelect` | — | AC-VENDOR-01, AC-VENDOR-02 |

Чисті функції в `src/lib/runs/domain.ts`: `yourTasksLabel(tasks, userId)` («Your tasks: N of K done»), `canMarkDone`
для вендора (лише власна задача), `runsListView` з порожнім станом вендора; `src/lib/templates/domain.ts`:
`Role` з `vendor`, `templatesPageAccess` (вендор — «Not enough rights»).

## Дані й RLS

Нових таблиць немає. Міграція `vendor_access`:

| Об'єкт | Зміна | AC |
|---|---|---|
| `profiles_role_check` | `role in ('manager', 'admin', 'vendor')`; `default 'manager'` без змін | усі |
| `private.list_assignable_users()` | повертає `manager`, `admin` і `vendor`; викликає лише `manager` чи `admin` (вендор — порожньо) | AC-VENDOR-02 |
| `private.launch_run(...)` | виконавцем можна призначити `vendor`; запускає й далі лише `manager` / `admin` → вендор отримує `NOT_ALLOWED`, запуск не створено | AC-VENDOR-01, AC-VENDOR-09 |
| політика `run_tasks_select_visible` | вендор бачить лише рядки, де `assignee_id = auth.uid()`; інші ролі — як раніше (`private.can_see_run`) | AC-VENDOR-03, AC-VENDOR-04, AC-VENDOR-06 |
| `runs_select_visible` | без змін: `can_see_run` пускає вендора лише в запуски, де він виконавець; менеджером запуску вендор не стає (`launch_run`) | AC-VENDOR-03, AC-VENDOR-06 |
| `private.mark_task_done` | без змін: позначає лише адміністратор, виконавець задачі або менеджер запуску → вендор — лише свою задачу | AC-VENDOR-05, AC-VENDOR-07 |
| політики `templates`, `template_versions`, `version_sections`, `version_tasks` | вендор не бачить жодного рядка (умова `current_app_role() <> 'vendor'` на select) | AC-VENDOR-08 |

Перевірки на сервері: кожна Server Action (`launchRun`, `markTaskDone`, дії редактора) — `getClaims()` і роль з
`profiles` до запису; другий рубіж — функції бази з перевіркою ролі (`launch_run`, `mark_task_done`).

## Auth

Вхід як у зрізах 1–2 (email + пароль, `getClaims()`); без входу — сторінка входу (proxy). Вендор — звичайний
користувач Supabase Auth; синтетичний акаунт `pm-vendor@example.test` для PM і UAT (D0.5, `accounts.zip`).

## Тести

| AC | Рівень | Де |
|---|---|---|
| AC-VENDOR-01, AC-VENDOR-02, AC-VENDOR-07, AC-VENDOR-08, AC-VENDOR-09 | база (PGlite) + e2e | `tests/db/vendor-access.test.ts`; відмови — SQL-мутанти в `scripts/mutants.mjs` |
| AC-VENDOR-03, AC-VENDOR-04, AC-VENDOR-06 | база (що видно вендору) + unit (рядки сторінки) + e2e | `tests/db/vendor-access.test.ts`, `tests/runs/vendor.test.ts` |
| AC-VENDOR-05, AC-VENDOR-10 | unit (`yourTasksLabel`, порожній стан) + база (позначка) + e2e | `tests/runs/vendor.test.ts`, `tests/db/vendor-access.test.ts` |

UAT на проді — `tests/e2e/vendor.spec.ts`; AC, що змінюють дані (AC-VENDOR-01, AC-VENDOR-05), — `@writes` із
синтетичними `uat-*@example.test` і прибиранням (`tests/e2e/support/admin.ts`, `OWNED_ROWS`).
