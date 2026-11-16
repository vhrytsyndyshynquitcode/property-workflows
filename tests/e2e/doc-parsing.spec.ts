// UAT зрізу 4 («Parse a document») на проді: AC-DOCAI-04 (людина підтверджує перед записом) і AC-DOCAI-14 (вендор не
// бачить блоку). openspec/specs/doc-parsing; requirements/59-parse-a-document-and-confirm-values.md.
// Дані — лише синтетичні: менеджер A і вендор V (uat-doc-vendor, окремий від зрізу 3) — uat-<прогін>-…@example.test (auth.setup.ts); запуск створює
// менеджер A; прибирання — cleanup.teardown.ts (запуски каскадом разом із записами doc_records). Тому — @writes.
// Кожен прогін AC-DOCAI-04 — 1 запит до моделі з денного ліміту (50 на добу).
import { expect, test, type Browser, type Page } from "@playwright/test";
import { uatUsers } from "./support/direct";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

test.describe.configure({ mode: "serial" });

const STATE = {
  manager: "playwright/.auth/uat-manager.json",
  vendor: "playwright/.auth/uat-doc-vendor.json",
} as const;
const TENANT_MOVE_IN = "00000000-0000-4000-8000-000000000001";
const CASE = "Apartment 12, leak";
const REQUEST =
  "Subject: Dripping tap. Hi, the kitchen tap in apartment 12 has been dripping for three days. Please send someone this week. My phone is 555-0101. Lena Test";
const UNAVAILABLE = "The assistant is not available now. Fill in the values yourself.";

let users: ReturnType<typeof uatUsers>;
let runUrl = "";
const pages: Page[] = [];

async function pageAs(browser: Browser, role: keyof typeof STATE): Promise<Page> {
  const context = await browser.newContext({ storageState: STATE[role] });
  const page = await context.newPage();
  pages.push(page);
  return page;
}

/** Менеджер A запускає «Tenant move-in» для «Apartment 12, leak»; задача «Order cleaning» — вендору V. */
async function ensureRun(browser: Browser) {
  if (runUrl) return;
  const manager = await pageAs(browser, "manager");
  await manager.goto(`/runs/new?template=${TENANT_MOVE_IN}`);
  await manager.getByLabel("Case name").fill(CASE);
  await manager.getByLabel("Order cleaning").selectOption({ label: users["uat-doc-vendor"] });
  await manager.getByRole("button", { name: "Launch" }).click();
  await manager.waitForURL(/\/runs\/[0-9a-f-]{36}$/);
  runUrl = manager.url();
}

test.beforeAll(() => {
  users = uatUsers();
});

test.afterEach(async ({ page }) => {
  await attachRuntimeErrors(page);
  for (const p of pages.splice(0)) await p.context().close();
});

test.describe("менеджер запуску A", () => {
  test.use({ storageState: STATE.manager });

  test(
    'AC-DOCAI-04: run manager A changes Urgency to "urgent" and chooses "Save values" — one saved record with A\'s email and the time',
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-DOCAI-04" } },
    async ({ page, browser }) => {
      let proposed = true;
      await given(`run manager A with the values of a request proposed in the block on the page of the run "${CASE}"`, async () => {
        await ensureRun(browser);
        await page.goto(runUrl);
        await page.getByLabel("Text of a request or an estimate").fill(REQUEST);
        await page.getByRole("button", { name: "Propose values" }).click();
        await expect(page.getByTestId("doc-values")).toBeVisible({ timeout: 90_000 });
        // Нічого ще не збережено: людина бачить пропозицію, а не запис.
        await expect(page.getByTestId("doc-records")).toHaveCount(0);
        // Помічник недоступний (ліміт, немає ключа) — та сама форма вручну (AC-DOCAI-13): заповнюємо значення PM.
        proposed = (await page.getByTestId("doc-message").filter({ hasText: UNAVAILABLE }).count()) === 0;
        if (!proposed) {
          await page.getByLabel("Document type").selectOption({ label: "Maintenance request" });
          await page.getByLabel("Phone").fill("555-0101");
          await page.getByLabel("Description").fill("The kitchen tap in apartment 12 has been dripping for three days.");
          await page.getByLabel("Category").selectOption("plumbing");
          await page.getByLabel("Urgency").selectOption("not urgent");
        }
        await expect(page.getByLabel("Document type")).toHaveValue("maintenance_request");
        await expect(page.getByLabel("Phone")).toHaveValue("555-0101");
        await expect(page.getByLabel("Category")).toHaveValue("plumbing");
        await expect(page.getByLabel("Urgency")).toHaveValue("not urgent");
      });
      await when('A changes Urgency to "urgent" and chooses "Save values"', async () => {
        await page.getByLabel("Urgency").selectOption("urgent");
        await page.getByRole("button", { name: "Save values" }).click();
      });
      await thenStep(
        page,
        {
          clause:
            'the page of the run shows one saved record with Document type "Maintenance request", Phone "555-0101", Category "plumbing" and Urgency "urgent", the email of A and the date and time of the confirmation.',
          visible: ['one saved record "Maintenance request"', 'Phone "555-0101"', 'Category "plumbing"', 'Urgency "urgent"', "the email of A and the date and time"],
          hidden: [proposed ? "the values were proposed by the AI" : "the assistant was not available — values filled in by hand (AC-DOCAI-13)"],
        },
        async () => {
          const record = page.getByTestId("doc-record");
          await expect(record).toHaveCount(1);
          await expect(record).toContainText("Document type: Maintenance request");
          await expect(record.getByTestId("doc-record-phone")).toHaveText("555-0101");
          await expect(record.getByTestId("doc-record-category")).toHaveText("plumbing");
          await expect(record.getByTestId("doc-record-urgency")).toHaveText("urgent");
          // Кадр «Тоді» знімає видиму частину сторінки — запис має бути в кадрі для агента й PM.
          await record.scrollIntoViewIfNeeded();
          await expect(record.getByTestId("doc-record-confirmed")).toHaveText(
            new RegExp(`^Confirmed by ${users["uat-manager"].replace(/[.+]/g, "\\$&")}, \\d{2} [A-Z][a-z]{2} \\d{4}, \\d{2}:\\d{2}$`),
          );
        },
      );
    },
  );
});

test.describe("вендор V", () => {
  test.use({ storageState: STATE.vendor });

  test(
    'AC-DOCAI-14: vendor V opens the page of the run — no block "Parse a document"',
    { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-DOCAI-14" } },
    async ({ page, browser }) => {
      await given(`vendor V who is the assignee of a task in the run "${CASE}"`, async () => {
        await ensureRun(browser);
      });
      await when("V opens the page of this run", async () => {
        await page.goto(runUrl);
      });
      await thenStep(
        page,
        {
          clause: 'V does not see the block "Parse a document".',
          visible: [`the page of the run "${CASE}" with V's own task "Order cleaning"`],
          hidden: ['no block "Parse a document"', "no saved records"],
        },
        async () => {
          await expect(page.getByTestId("task-row")).toHaveCount(1);
          await expect(page.getByText("Parse a document")).toHaveCount(0);
          await expect(page.getByTestId("doc-parse-block")).toHaveCount(0);
          await expect(page.getByTestId("doc-records")).toHaveCount(0);
        },
      );
    },
  );
});
