# 0003. Next.js 16.4.0 → 16.4.3: патч безпеки в межах лінійки 16.4

- Статус: прийнято
- Дата: 2026-10-26
- AC: — (безпека платформи; стосується всіх сторінок і Server Actions, зокрема AC-EDITOR-01…09)

## Контекст

AGENTS.md фіксує стек «Next.js 16.4» і забороняє оновлювати його без ADR. Встановлено `next` 16.4.0, і для нього
опубліковано три advisory (діапазон `>= 16.0.0, <= 16.4.0`, перша виправлена версія — 16.4.1; `npm audit --omit=dev` —
critical):

- [GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw) (critical) — неавтентифікований RCE в
  Image Optimization API при SVG;
- [GHSA-p3m5-59mp-jv5r](https://github.com/advisories/GHSA-p3m5-59mp-jv5r) (high, CVE-2026-94482) — DoS в App
  Router через Server Actions;
- [GHSA-673q-mjm6-r5xr](https://github.com/advisories/GHSA-673q-mjm6-r5xr) (critical) — RCE у функціях `use cache`,
  що повертають typed arrays.

Нас прямо стосується друге: усі дії редактора шаблонів і запусків — Server Actions, тобто публічні POST на проді.
`next/image` і `use cache` ми не використовуємо, але вразливий код є в розгорнутому застосунку. До того ж `next build`
16.4.0 зупиняється з `SecurityFatalError` (повторний запуск проходить) — збірка в CI й на Vercel стає нестабільною.

## Рішення

- `next` і `eslint-config-next` → **16.4.3** (точна версія, `--save-exact`, як і було) — остання патч-версія лінійки
  16.4: закриває всі три advisory і її ж пропонує `npm audit fix`. Рядок стеку в AGENTS.md («Next.js 16.4») лишається
  правдивим; React 19.3 і решта стеку не змінюються.
- Нічого в коді не змінюється: патч-версія без змін API.

## Розглянуті варіанти

- **16.4.1 (перша виправлена)** — чому ні: закриває ті самі advisory, але 16.4.2 і 16.4.3 — теж лише виправлення в
  межах лінійки; брати мінімальну версію означало б свідомо лишити відомі вже виправлені баги.
- **Наступна мінорна (`next@canary`, 16.5.0-canary.\*)** — чому ні: передреліз; нова мінорна могла б змінити API App
  Router, а шаблон курсу її не перевіряв. (Станом на 26.10.2026 dist-tag `latest` = 16.4.3, тобто збігається з
  обраною версією; закріплюємо її точно, а не тегом, щоб `latest` не переніс нас на 16.5 при наступному встановленні.)
- **Лишити 16.4.0 і вимкнути вразливі можливості** — чому ні: Server Actions — основа застосунку, їх не вимкнути;
  збірка й далі падала б із `SecurityFatalError`.

## Наслідки

- Простіше: `npm audit --omit=dev` більше не показує `next`; `next build` проходить з першого разу.
- Складніше: нічого нового. Окремо лишається `zod` < 4.6.6 (high,
  [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)) — транзитивна залежність CLI `shadcn`,
  у рантаймі застосунку не працює; оновлюємо окремим PR, щоб не змішувати з патчем Next.js.

## Як перевіряємо

- `npm audit --omit=dev` — `next` відсутній у звіті.
- `npm run lint`, `npm run typecheck`, `npm test` (94), `npm run build` (`▲ Next.js 16.4.3`, `ƒ Proxy (Middleware)`, без
  `SecurityFatalError`), `check:design`, `check:boundary`; CI `app` і `architecture` у PR.
- `npm run dev` на 16.4.3: `GET /login 200`, `/templates` без входу → `/login` (AC-DSYS-03), без помилок у консолі.
