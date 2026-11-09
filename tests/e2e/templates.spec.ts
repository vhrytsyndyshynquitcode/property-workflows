// UAT зрізу 2 (редактор шаблонів) на проді: 3 AC WS8 — AC-EDITOR-07, AC-EDITOR-09, AC-EDITOR-19 (docs/qa/proof-pack-ws8.md).
// Усі три лише читають: відмови й помилка порожньої назви, яку дія відхиляє ще до запису в базу.
// Тексти «Тоді» — дослівно з вимоги PM (requirements/ → openspec/specs/template-editor/spec.md).
import { expect, test, type Page } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

// «Tenant move-in» — шаблон з міграції 20261020073540_workflow_runs.sql (є на проді з першого розгортання).
const TENANT_MOVE_IN = "00000000-0000-4000-8000-000000000001";
// Розділи й задачі цього шаблону: вміст, якого відмова не має показати.
const TEMPLATE_CONTENT = ["Before move-in", "Move-in day"];

/** Скільки шаблонів у списку /templates (кожен — посилання на /templates/<id>). */
async function templateCount(page: Page): Promise<number> {
  await page.goto("/templates");
  return page.locator('main a[href^="/templates/"]:not([href="/templates/new"])').count();
}

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test.describe("менеджер", () => {
  test.use({ storageState: "playwright/.auth/manager.json" });

  test(
    'AC-EDITOR-07: manager B opens the list of versions by a direct link — "Not enough rights" and no versions',
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-EDITOR-07" } },
    async ({ page }) => {
      await given('manager B signed in and the template "Tenant move-in" with versions', async () => {
        await page.goto("/");
        await expect(page.getByTestId("user-role")).toHaveText("manager");
      });

      await when("B opens the list of versions of this template by a direct link", async () => {
        await page.goto(`/templates/${TENANT_MOVE_IN}/versions`);
      });

      await thenStep(
        page,
        {
          clause: 'B sees the message "Not enough rights" and no versions.',
          visible: ['the message "Not enough rights"', 'the page "Versions" without a list of versions'],
          hidden: ["no versions: no table on the page and no row with a version number or a saved date"],
        },
        async () => {
          await expect(page).toHaveURL((url) => url.pathname === `/templates/${TENANT_MOVE_IN}/versions`);
          await expect(page.getByRole("main").getByRole("alert")).toHaveText("Not enough rights");
          await expect(page.getByRole("table")).toHaveCount(0);
          await expect(page.getByText(/\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}/)).toHaveCount(0);
          await expect(page.getByText("Tenant move-in")).toHaveCount(0);
        },
      );
    },
  );
});

test.describe("відвідувач без входу", () => {
  test(
    "AC-EDITOR-09: a visitor who is not signed in opens the editor by a direct link — the sign-in page and no content of the template",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-EDITOR-09" } },
    async ({ page }) => {
      await given("a visitor who is not signed in", async () => {
        await page.context().clearCookies();
      });

      await when('the visitor opens the editor of the template "Tenant move-in" by a direct link', async () => {
        await page.goto(`/templates/${TENANT_MOVE_IN}/edit`);
      });

      await thenStep(
        page,
        {
          clause: "the visitor sees the sign-in page and no content of the template.",
          visible: ['the sign-in page (heading "Sign in", fields "Email" and "Password")'],
          hidden: [
            'no content of the template: no name "Tenant move-in", no sections "Before move-in" or "Move-in day" in the page',
            "the session is absent: the address is /login",
          ],
        },
        async () => {
          await expect(page).toHaveURL((url) => url.pathname === "/login");
          await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
          await expect(page.getByLabel("Email")).toBeVisible();
          await expect(page.getByLabel("Password")).toBeVisible();
          await expect(page.getByText("Tenant move-in")).toHaveCount(0);
          for (const text of TEMPLATE_CONTENT) await expect(page.getByText(text)).toHaveCount(0);
        },
      );
    },
  );
});

test.describe("адміністратор", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test(
    'AC-EDITOR-19: administrator A creates a template with an empty name or only spaces — no template is created and "Enter a template name"',
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-EDITOR-19" } },
    async ({ page }) => {
      let before = 0;
      await given("administrator A", async () => {
        await page.goto("/");
        await expect(page.getByTestId("user-role")).toHaveText("admin");
        before = await templateCount(page);
      });

      await when("A creates a new template with the name consisting only of spaces", async () => {
        await page.goto("/templates/new");
        await page.getByLabel("Template name").fill("   ");
        await page.getByRole("button", { name: "Create" }).click();
        await page.waitForURL((url) => url.searchParams.get("error") === "name_empty");
      });

      // Два «Тоді»: кадр першого — форма з повідомленням; другий перевіряє список шаблонів (кадр — список).
      await thenStep(
        page,
        {
          clause: 'A sees the message "Enter a template name".',
          visible: ['the message "Enter a template name" under the field "Template name"', 'the form "New template" is still open'],
        },
        async () => {
          await expect(page).toHaveURL((url) => url.pathname === "/templates/new");
          await expect(page.getByRole("main").getByRole("alert")).toHaveText("Enter a template name");
          await expect(page.getByLabel("Template name")).toBeVisible();
        },
      );

      await thenStep(
        page,
        {
          clause: "no template is created",
          visible: ["the list of templates"],
          hidden: ["no template is created: the list has the same number of templates as before the attempt"],
        },
        async () => {
          expect(await templateCount(page)).toBe(before);
        },
      );
    },
  );
});
