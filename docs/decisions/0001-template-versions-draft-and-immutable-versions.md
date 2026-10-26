# 0001. Версії шаблону: робоча копія + незмінні версії, збереження — функція бази

- Статус: прийнято
- Дата: 2026-10-26
- AC: AC-EDITOR-01, AC-EDITOR-02, AC-EDITOR-03, AC-EDITOR-04, AC-EDITOR-06, AC-EDITOR-08, AC-EDITOR-09

## Контекст

Зріз 2 (solomchaak/property-workflows-spec#20): адміністратор редагує шаблон, і кожна зміна зберігається автоматично як
неопубліковані зміни (AC-EDITOR-01); збереження створює нумеровану незмінну версію (AC-EDITOR-03), але лише якщо є
обов'язкова задача (AC-EDITOR-04); менеджер бачить тільки поточну версію (AC-EDITOR-02); запуск показує свою версію
(AC-EDITOR-06). Менеджер і відвідувач без входу не можуть змінити шаблон навіть запитом повз сторінки (AC-EDITOR-08,
AC-EDITOR-09; Product: «whether through the pages or by sending the request directly»). Публічний ключ Supabase — у
JS-бандлі, Server Action — публічний POST, тож захищати мусить база. У зрізі 1 шаблон уже був у таблицях
`template_sections` / `template_tasks`, а запуски копіювали з них задачі.

## Рішення

- **Робоча копія** — наявні `template_sections` / `template_tasks`: їх бачить і змінює лише `admin` (окремі політики на
  select / insert / update / delete, column grants `update (name, position[, is_required, section_id])`); тригер
  ставить `templates.has_unpublished_changes = true` на будь-яку зміну.
- **Версії** — нові `template_versions` (номер, час, автор) + `version_sections` / `version_tasks`: для `authenticated`
  лише `select` (admin — усі; manager — поточна версія і версії видимих йому запусків), без update / delete — версія
  незмінна. `anon` не має жодного grant.
- **Збереження** — функція `private.save_template_version` (`security definer`, `set search_path = ''`) з перевіркою
  ролі `admin` першим рядком, перевіркою обов'язкової задачі, номером `max + 1`, копією робочої копії у версію й
  оновленням `templates.current_version_id` — однією транзакцією; з застосунку — тонка обгортка
  `public.save_template_version` (`security invoker`), `execute` лише `authenticated`.
- `templates`: column grant лише `insert (name)`, `update (name)` — `current_version_id` і `has_unpublished_changes`
  змінює тільки функція. Запуск (`private.launch_run`) копіює задачі з поточної версії й пише `runs.template_version_id`.
- Server Actions редактора все одно починаються з `getClaims()` і ролі з `profiles` — це UX і перший рубіж; база — другий.

## Розглянуті варіанти

- **Шаблон як JSON-документ (`templates.draft jsonb`, `template_versions.snapshot jsonb`)** — чому ні: RLS і column
  grants діють на рядки й колонки, а не на поля JSON, тож менеджеру довелося б заборонити весь рядок шаблону або
  перевіряти JSON у функції; запуск і зріз 1 уже працюють з реляційними задачами — довелося б переписати
  `launch_run` і сторінки запуску; перевірку «є обов'язкова задача» в JSON не виразити constraint-ом.
- **Server Action з admin-клієнтом (`SUPABASE_SECRET_KEY`) для збереження версії** — чому ні: ключ обходить RLS, тож
  захист тримався б лише на перевірці в дії; кілька записів (версія, розділи, задачі, поточна версія) без транзакції
  supabase-js можуть лишити напівзбережену версію; ключ довелося б додати у Vercel, а зріз Admin API не потребує
  (правило курсу: ключ у Vercel — лише для Admin API).
- **Копіювати версії в окрему копію шаблону (новий рядок `templates` на кожну версію)** — чому ні: «поточна версія» й
  список версій стали б пошуком серед схожих шаблонів; номер версії не мав би природного обмеження `unique
  (template_id, number)`.

## Наслідки

- Простіше: права шаблону й версій видно в одній міграції; тест бази перевіряє і відмову, і незмінні дані; запуск
  лишився знімком задач, як у зрізі 1.
- Складніше: дві структури (робоча копія й версія) з однаковою формою — нові поля задачі (зріз WS9) доведеться додати в
  обидві й у `private.copy_draft_to_version`.
- Наявні шаблони й запуски зрізу 1 міграція зробила версією 1 (робоче припущення до відповіді PM на
  solomchaak/property-workflows-spec#33).

## Як перевіряємо

- Тести бази `tests/db/template-versions.test.ts` (PGlite, `asUser` / `asAnon` / `asService`) з AC ID: AC-EDITOR-08
  (менеджер і відвідувач напряму — відмова, шаблон незмінний), AC-EDITOR-02, AC-EDITOR-04, AC-EDITOR-09. Мутаційна
  перевірка в PR #16 — червоні прогони CI без перевірки ролі й з `using (true)`.
- Архітектурне правило в `.github/workflows/architecture.yml`, job «Секретний ключ лише на сервері»
  (`scripts/check-server-boundary.mjs`): `SUPABASE_SECRET_KEY` і admin-клієнт — лише в `src/lib/supabase/admin.ts` з
  `server-only`; спроба «спростити» збереження admin-клієнтом у сторінці чи Client Component червонить CI (доказ —
  червоний прогін у PR задачі 2).
