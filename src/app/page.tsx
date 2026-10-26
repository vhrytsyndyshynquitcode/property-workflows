import Link from "next/link";
import { redirect } from "next/navigation";
import { APP_NAV } from "@/components/app/app-nav";
import { SignOutButton } from "@/components/app/sign-out-button";
import { Card, CardContent } from "@/components/ui/card";
import { AppShell, PageHeader } from "@/components/ui/page";
import { createClient } from "@/lib/supabase/server";

// Головна: хто увійшов і з якою роллю (з таблиці profiles).
export default async function Home() {
  const supabase = await createClient();

  // getClaims() перевіряє JWT. getSession() для авторизації на сервері не використовуємо.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) {
    redirect("/login");
  }

  // RLS: користувач бачить лише власний профіль.
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, role")
    .eq("id", claims.sub)
    .maybeSingle();

  return (
    <AppShell nav={APP_NAV} actions={<SignOutButton />}>
      <PageHeader title="Property workflows" description="Launch a template for a case and track its progress." />
      <Card>
        <CardContent>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Email</dt>
            <dd data-testid="user-email">{profile?.email ?? claims.email ?? "—"}</dd>
            <dt className="text-muted-foreground">Role</dt>
            <dd data-testid="user-role">{profile?.role ?? "profile not found"}</dd>
          </dl>
        </CardContent>
      </Card>
      <p className="text-sm">
        <Link href="/runs" className="text-primary underline-offset-4 hover:underline">
          Go to runs
        </Link>
      </p>
    </AppShell>
  );
}
