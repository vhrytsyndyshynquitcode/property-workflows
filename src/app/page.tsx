import Link from "next/link";
import { redirect } from "next/navigation";
import { APP_NAV } from "@/components/app/app-nav";
import { SignOutButton } from "@/components/app/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell, PageHeader } from "@/components/ui/page";
import { createClient } from "@/lib/supabase/server";

// Куди можна піти з головної — ті самі розділи, що в навігації, з одним реченням пояснення.
const DESTINATIONS = [
  { href: "/runs", title: "Runs", description: "Track the progress of runs and their tasks." },
  { href: "/runs/new", title: "Launch a template", description: "Name the case, assign the tasks and start a run." },
  { href: "/templates", title: "Templates", description: "Browse templates and their current versions." },
];

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
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Signed in as</span>
            <span data-testid="user-email" className="font-medium">
              {profile?.email ?? claims.email ?? "—"}
            </span>
          </div>
          <Badge variant="secondary" data-testid="user-role" className="capitalize">
            {profile?.role ?? "profile not found"}
          </Badge>
        </CardContent>
      </Card>
      <nav aria-label="Start" className="grid gap-4 sm:grid-cols-3">
        {DESTINATIONS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Card className="h-full transition-shadow group-hover:shadow-md group-hover:ring-primary/40">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground group-hover:text-primary">
                  {item.title}
                </CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </nav>
    </AppShell>
  );
}
