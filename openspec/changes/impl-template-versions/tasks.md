## 1. Версії в базі: міграція, RLS, функції, тести бази

- [ ] 1.1 Тести бази на PGlite: `tests/db/supabase-pglite.ts` (взято з демо, адаптовано: `asUser`, `asAnon`, `asService`)
- [ ] 1.2 Міграція: `template_versions`, `version_sections`, `version_tasks`, `templates.current_version_id`, `has_unpublished_changes`, `runs.template_version_id`; RLS на кожну операцію, revoke + явні grant, column grants; нові політики `templates` і робочої копії (лише admin); перехід від зрізу 1 (версія 1)
- [ ] 1.3 Функції: `save_template_version` (роль admin, обов'язкова задача, номер, копія, current), `launch_run` з поточної версії
- [ ] 1.4 Тести відмов на рівні бази з AC ID (відмова + незмінні дані) і мутаційна перевірка (таблиця в PR, ≥2 червоні прогони CI)

Done when: AC-EDITOR-02, AC-EDITOR-03, AC-EDITOR-04, AC-EDITOR-06, AC-EDITOR-08, AC-EDITOR-09 мають тест бази; міграція пройшла `db-check` і `db-deploy`

## 2. Сторінки шаблонів і редактор

- [ ] 2.1 `/templates`, `/templates/new`, `/templates/[id]`: списки за роллю, позначка «Unpublished changes»
- [ ] 2.2 `/templates/[id]/edit`: server actions з `getClaims()` і роллю (додати / перейменувати / видалити / пересунути розділ і задачу, required), «Save», «A template needs at least one required task», «Not enough rights» + «Back to templates»
- [ ] 2.3 `/templates/[id]/versions`: номер, дата Київ, email, новіші першими; «Not enough rights» для manager
- [ ] 2.4 Запуск з поточної версії й «Template version N» на сторінці запуску; дизайн-система на всіх сторінках
- [ ] 2.5 Тести логіки сторінок і дій з AC ID; рядки матриці; акаунти `pm-admin`, `pm-manager`; скріни за ролями; archive `impl-template-versions`

Done when: AC-EDITOR-01, AC-EDITOR-05, AC-EDITOR-07, AC-DSYS-01, AC-DSYS-02, AC-DSYS-03, AC-DSYS-04 працюють на прод-URL і мають тест логіки
