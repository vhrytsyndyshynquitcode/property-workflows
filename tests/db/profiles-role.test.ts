import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

// Пастка «update own row + колонка role» (міграції 20261012000000_profiles_and_roles.sql, 20261020073540_workflow_runs.sql):
// політика profiles_update_own дозволяє оновити власний рядок, тож роль захищає лише column grant `update (full_name)`.
// Менеджер, що став би адміністратором, обійшов би всі заборони редактора шаблонів (AC-EDITOR-08).

let t: TestDb;
let MANAGER_B: string;

const role = async (id: string) =>
  (await t.asService<{ role: string }>("select role from public.profiles where id = $1", [id]))[0]?.role;

beforeAll(async () => {
  t = await createTestDb();
  MANAGER_B = t.users["member2@example.test"];
}, 60_000);

describe("profiles role (db)", () => {
  it("AC-EDITOR-08: manager B cannot make themselves admin by updating their own profile; role stays manager", async () => {
    await expect(
      t.asUser(MANAGER_B, "update public.profiles set role = 'admin' where id = $1", [MANAGER_B]),
    ).rejects.toThrow(/permission denied/);
    expect(await role(MANAGER_B)).toBe("manager");

    // Дозволена колонка оновлюється — відмова саме через role, а не через весь рядок.
    const renamed = await t.asUser<{ id: string }>(
      MANAGER_B,
      "update public.profiles set full_name = 'Manager B renamed' where id = $1 returning id",
      [MANAGER_B],
    );
    expect(renamed).toHaveLength(1);
    expect(await role(MANAGER_B)).toBe("manager");
  });

  it("AC-EDITOR-08: a new user who puts role admin into their sign-up data still gets the manager role", async () => {
    const id = "a0000000-0000-0000-0000-0000000000ff";
    await t.db.exec("begin; set local role supabase_auth_admin;");
    await t.db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [
      id,
      "new-user@example.test",
      { full_name: "New user", role: "admin" },
    ]);
    await t.db.exec("commit");

    expect(await role(id)).toBe("manager");
  });
});
