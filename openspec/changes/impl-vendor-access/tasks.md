## 1. Роль вендора в базі: міграція, RLS, функції, тести бази

- [x] 1.1 Міграція `vendor_access`: `profiles_role_check` з `vendor` (порядок з AGENTS.md), `list_assignable_users` з вендорами, `launch_run` приймає вендора як виконавця
- [x] 1.2 RLS: `run_tasks` — вендор бачить лише свої задачі; `templates` і версії — вендор не бачить нічого
- [x] 1.3 Тести бази на PGlite з AC ID (відмова + незмінні дані) і SQL-мутанти на відмови (`npm run mutation:sql` → KILLED)

Done when: AC-VENDOR-01, AC-VENDOR-02, AC-VENDOR-03, AC-VENDOR-04, AC-VENDOR-06, AC-VENDOR-07, AC-VENDOR-08, AC-VENDOR-09 мають тест бази; міграція пройшла `db-check` і `db-deploy`

## 2. Сторінки вендора

- [ ] 2.1 Навігація без «Templates» і «Launch a template» для вендора; `/templates*` і `/runs/new` — «Not enough rights»
- [ ] 2.2 `/runs`: запуски вендора з «Your tasks: N of K done», порожній стан «No tasks assigned to you yet.»
- [ ] 2.3 `/runs/[id]`: лише власні задачі вендора, «Your tasks: N of K done», позначка своєї задачі
- [ ] 2.4 Unit-тести з AC ID; рядки `docs/conformance.md`

Done when: AC-VENDOR-03, AC-VENDOR-04, AC-VENDOR-05, AC-VENDOR-08, AC-VENDOR-09, AC-VENDOR-10 працюють на прод-URL і мають тест логіки

## 3. Акаунт вендора, UAT і proof pack

- [ ] 3.1 `pm-vendor@example.test` у `supabase/demo-users.json`; `npm run users:demo`; оновлений `accounts.zip`
- [ ] 3.2 Специфікації Playwright на кожен AC-VENDOR (`tests/e2e/vendor.spec.ts`), прогін на проді, звіт і негативний контроль
- [ ] 3.3 `docs/qa/proof-pack.md` на кожен AC зрізу 3; archive `impl-vendor-access`

Done when: AC-VENDOR-01 … AC-VENDOR-10 мають UAT-запис на проді й рядок proof pack
