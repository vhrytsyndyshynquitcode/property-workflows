import { APP_NAV } from "@/components/app/app-nav";
import { NotEnoughRights } from "@/components/app/not-enough-rights";
import { SignOutButton } from "@/components/app/sign-out-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell, PageHeader } from "@/components/ui/page";
import { adminPageAccess } from "@/lib/templates/domain";
import { currentUser } from "@/lib/templates/server";
import { createTemplate } from "../actions";

// Новий шаблон — лише admin; новий шаблон одразу має «Unpublished changes» і не видимий менеджерам (AC-EDITOR-04).
export default async function NewTemplatePage() {
  const { role } = await currentUser();
  const access = adminPageAccess(role);

  return (
    <AppShell nav={APP_NAV} actions={<SignOutButton />}>
      <PageHeader title="New template" />
      {access.kind !== "allowed" ? (
        <NotEnoughRights />
      ) : (
        <Card>
          <CardContent>
            <form action={createTemplate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Template name</Label>
                <Input id="name" name="name" placeholder="Repair" required />
              </div>
              <Button type="submit" className="self-start">
                Create
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
