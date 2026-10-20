## 1. База, правила й тести

- [x] 1.1 Міграція: ролі `manager`/`admin`, таблиці шаблонів і запусків, GRANT + RLS, функції `launch_run`, `mark_task_done`, `list_assignable_users`, шаблон «Tenant move-in»; `supabase/demo-users.json` з ролями `manager`/`admin`; типи бази
- [x] 1.2 Доменний модуль `src/lib/runs/domain.ts`: назва випадку, побудова запуску, виконавці, право позначити, статус запуску, прогрес, видимість
- [x] 1.3 Тести з AC ID: `tests/runs/launch.test.ts`, `tests/runs/tasks.test.ts`

Done when: AC-RUN-01, AC-RUN-02, AC-RUN-03, AC-RUN-04, AC-RUN-05, AC-RUN-06, AC-RUN-07, AC-RUN-08, AC-RUN-09, AC-TASK-01, AC-TASK-02, AC-TASK-03, AC-TASK-04, AC-TASK-05, AC-TASK-06, AC-TASK-07, AC-TASK-08, AC-TASK-09 мають тест із правилом; міграція пройшла `db-check` і `db-deploy`

## 2. Сторінки й server actions

- [x] 2.1 `/runs/new` і server action `launchRun`: вибір шаблону, назва випадку, виконавці задач, повідомлення PM
- [x] 2.2 `/runs/[id]` і server action `markTaskDone`: прогрес, задачі за розділами, статуси, «Mark as done», повідомлення AC-TASK-03
- [x] 2.3 `/runs`: список видимих запусків зі статусом і прогресом; посилання з головної
- [ ] 2.4 Перевірка на прод-URL під синтетичними користувачами; рядки матриці «реалізовано»; archive `impl-workflow-runs`

Done when: AC-RUN-01, AC-RUN-03, AC-RUN-04, AC-RUN-07, AC-TASK-01, AC-TASK-03, AC-TASK-05, AC-TASK-06, AC-TASK-08, AC-TASK-09 працюють на прод-URL
