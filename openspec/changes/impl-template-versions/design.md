# Design: template-versions (зріз 2)

Ролі не змінюються: `manager`, `admin` (`profiles.role`, `profiles_role_check` з міграції зрізу 1). Міграція ролей
drop-first не потрібна. Роль — лише з `public.profiles` (`private.current_app_role()`), ніколи з `user_metadata`.

## UI і компоненти

Усі сторінки — у `AppShell` / `PageHeader` з `@/components/ui` (DESIGN.md), лише токени; тексти — дослівно з AC.

| Сторінка | Хто | Компоненти | Стани й тексти | AC |
|---|---|---|---|---|
| `/templates` | admin — усі шаблони, позначка `StatusBadge draft` «Unpublished changes»; manager — лише шаблони з поточною версією | `Table`, `StatusBadge`, `Button` («New template», admin) | порожній список — `text-muted-foreground` | AC-EDITOR-01, AC-EDITOR-02 |
| `/templates/new` | admin | `Card`, `Input`, `Label`, `Button` «Create» | — | AC-EDITOR-04 |
| `/templates/[id]` | admin — поточна версія + посилання «Edit», «Versions»; manager — поточна версія без позначки | `Card`, `StatusBadge` | шаблон без версії для manager — «Template not found» | AC-EDITOR-02 |
| `/templates/[id]/edit` | admin — редактор чернетки; manager — «Not enough rights» + «Back to templates», без вмісту; без входу — сторінка входу | `Card`, `Input`, `Label`, `Button`, `NativeSelect`, `Alert`, `StatusBadge draft` | «Unpublished changes», «A template needs at least one required task» (Alert destructive), «Version N saved» (Alert) | AC-EDITOR-01, AC-EDITOR-03, AC-EDITOR-04, AC-DSYS-02, AC-EDITOR-09 |
| `/templates/[id]/versions` | admin — номер, «DD.MM.YYYY HH:MM» (Київ), email, новіші першими; manager — «Not enough rights», без версій | `Table`, `Alert` | — | AC-EDITOR-05, AC-EDITOR-07 |
| `/runs`, `/runs/[id]` | як у зрізі 1 + рядок «Template version N» | `StatusBadge` (той самий тон для того самого статусу), `Table` | «No runs yet. Launch a template to start one.» + «Launch a template» | AC-EDITOR-06, AC-DSYS-01, AC-DSYS-03, AC-DSYS-04 |
| `/runs/new` | запуск лише з поточної версії; шаблони без версії не показуються | `NativeSelect`, `Input`, `Button` | — | AC-EDITOR-06 |

Редактор (лише admin): додати / перейменувати / видалити / пересунути вгору-вниз розділ і задачу, позначити задачу
required/optional. Кожна правка — окрема server action, що одразу пише в базу (зміни зберігаються автоматично,
AC-EDITOR-01); «Save» — створює версію (AC-EDITOR-03). Відкинути неопубліковані зміни — не робимо (Q1 PM).

## Дані й RLS

**Робоча копія (неопубліковані зміни)** — наявні `template_sections` і `template_tasks`; **версії** — нові незмінні
таблиці. Запуск копіює задачі з поточної версії (знімок, як у зрізі 1) і зберігає `template_version_id`.

| Таблиця / колонка | Призначення | AC |
|---|---|---|
| `templates.current_version_id` → `template_versions` | поточна версія; `null` — шаблон ніколи не зберігався | AC-EDITOR-02, AC-EDITOR-03 |
| `templates.has_unpublished_changes boolean` | позначка «Unpublished changes»; `true` для нового шаблону; тригер на зміну `template_sections`/`template_tasks` ставить `true`, збереження версії — `false` | AC-EDITOR-01, AC-EDITOR-03, AC-EDITOR-04 |
| `template_versions (id, template_id, number, created_at, created_by → profiles)`, `unique (template_id, number)` | нумерована версія; номер не перевикористовується | AC-EDITOR-03, AC-EDITOR-05 |
| `version_sections`, `version_tasks` | вміст версії (розділи, задачі, required) | AC-EDITOR-02, AC-EDITOR-06 |
| `runs.template_version_id` → `template_versions` | версія запуску | AC-EDITOR-06 |

**Права — для кожної нової таблиці `enable row level security`, `revoke all … from anon, authenticated`, явні `grant`,
окрема політика на кожну операцію `to authenticated` з `(select private.current_app_role())` / `(select auth.uid())`.
`anon` не має жодного grant (AC-EDITOR-09; solomchaak/property-workflows-spec#32).**

| Таблиця | select | insert | update | delete | Column grants |
|---|---|---|---|---|---|
| `templates` | admin — усі; manager — лише з `current_version_id is not null` (AC-EDITOR-02) | admin | admin | — (видалення поза зрізом; grant не даємо) | `update (name)` — `current_version_id`, `has_unpublished_changes` змінює лише функція бази |
| `template_sections`, `template_tasks` (робоча копія) | лише admin (AC-EDITOR-02: менеджер не бачить неопублікованих змін) | admin | admin | admin | `update (name, position)`, `update (name, position, is_required, section_id)`; `template_id` — без update |
| `template_versions` | admin — усі; manager — лише поточна версія шаблону (AC-EDITOR-02, AC-EDITOR-06; список — AC-EDITOR-07 на сторінці) | — (лише функція) | — | — | — |
| `version_sections`, `version_tasks` | admin — усі; manager — лише поточної версії або версії видимого йому запуску (AC-EDITOR-06) | — | — | — | — |

Політики `templates` і робочої копії змінюються новою міграцією (застосовані — не редагуємо): стару
`templates_select` / `template_sections_select` / `template_tasks_select` (`using (true)`) замінюємо.

**Функції бази (security definer лише в `private`, `set search_path = ''`, `revoke execute … from public, anon`):**

- `private.save_template_version(p_template_id)` + обгортка `public.save_template_version` (`security invoker`):
  першим рядком — роль `admin`, інакше `NOT_ALLOWED` (AC-EDITOR-08); немає обов'язкової задачі в робочій копії —
  `NO_REQUIRED_TASK`, нічого не змінено (AC-EDITOR-04); номер — `max + 1`; копія розділів і задач у `version_*`;
  `current_version_id` ← нова версія; `has_unpublished_changes` ← `false` (AC-EDITOR-03). Однією транзакцією.
- `private.launch_run` (перевизначення): задачі — з `version_tasks` поточної версії; шаблон без версії —
  `TEMPLATE_NOT_FOUND`; `runs.template_version_id` ← поточна версія (AC-EDITOR-06).
- Перехід від зрізу 1 (solomchaak/property-workflows-spec#33, робоче припущення A): наявні шаблони стають версією 1
  (автор — перший `admin`), наявні запуски прив'язуються до версії 1.

## Auth

- `src/proxy.ts` лише оновлює сесію й перенаправляє на `/login` — це UX, не захист.
- Кожна сторінка й server action редактора починається з `supabase.auth.getClaims()` (не `getSession()`); немає
  claims — `redirect("/login")` (AC-EDITOR-09, AC-DSYS-03); роль — з `profiles` за `claims.sub`; не `admin` — сторінка
  «Not enough rights» + «Back to templates» (AC-DSYS-02, AC-EDITOR-07), дія — помилка без запису.
- Запис — серверним клієнтом користувача, тож діють RLS і GRANT: навіть дія, викликана напряму в обхід перевірки,
  упреться в політику (AC-EDITOR-08). Привілейоване збереження версії — лише функцією бази.
- Admin-клієнт (`SUPABASE_SECRET_KEY`) **не потрібен**: користувачів і ролі не змінюємо, запрошень немає; ключа у Vercel
  немає, як і у зрізі 1. `check:boundary` у `architecture.yml` охороняє це.
- Кандидати в ADR: «неопубліковані зміни в робочих таблицях + незмінні версії, збереження — функція бази» (проти
  JSON-знімка шаблону й проти Server Action з admin-клієнтом).
