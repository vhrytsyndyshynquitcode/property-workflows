## 1. Набір AI, ADR і ключ на сервері

- [ ] 1.1 ADR 0009, залежності з точними версіями (`ai`, `@openrouter/ai-sdk-provider`, `zod`, `server-only`),
  скрипти `eval`, `ai:models`, `ai:quota`, `OPENROUTER_API_KEY` у `.env.example`; `tests/ai-key.test.ts` зелений.
  Done when: AC-DOCAI-13

## 2. Записи документів у базі

- [ ] 2.1 Міграція `doc_records`, RLS, `save_doc_record`, `can_parse_documents`; тести PGlite від імені менеджера
  запуску, виконавця-менеджера, вендора й адміністратора.
  Done when: AC-DOCAI-04, AC-DOCAI-16

## 3. AI-функція і блок на сторінці запуску

- [ ] 3.1 Схема, промпт, правила в коді (сума, телефон, примітки), Server Actions, блок «Parse a document», записи на
  сторінці запуску.
  Done when: AC-DOCAI-01, AC-DOCAI-02, AC-DOCAI-03, AC-DOCAI-04, AC-DOCAI-05, AC-DOCAI-06, AC-DOCAI-07, AC-DOCAI-08,
  AC-DOCAI-09, AC-DOCAI-10, AC-DOCAI-11, AC-DOCAI-12, AC-DOCAI-13, AC-DOCAI-14, AC-DOCAI-15, AC-DOCAI-16

## 4. Evals

- [ ] 4.1 `cases.json` з 10 кейсів PM, офлайн-реплей з AC ID, тести збоїв і ін'єкції; живий прогін і звіт у
  `evals/reports/`.
  Done when: AC-DOCAI-01, AC-DOCAI-02, AC-DOCAI-06, AC-DOCAI-07, AC-DOCAI-08, AC-DOCAI-09, AC-DOCAI-10, AC-DOCAI-13

## 5. Прод і UAT

- [ ] 5.1 Прод, UAT на 2 AC (AC-DOCAI-04 — підтвердження людиною, AC-DOCAI-14 — відмова), `docs/conformance.md`.
  Done when: AC-DOCAI-04, AC-DOCAI-14
