import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MochiPuff } from "@/components/ui/mochi-puff";
import { AppShell } from "@/components/ui/page";
import { login } from "./actions";

const ERRORS: Record<string, string> = {
  missing: "Enter your email and password.",
  invalid: "Email or password is incorrect.",
};

// Сторінка входу в тому самому макеті, що й решта застосунку (AC-DSYS-03, AC-EDITOR-09). Збоку — талісман
// Mochi-Puff, що стежить за курсором (ADR 0004): на телефоні — над формою й менше.
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <AppShell className="max-w-4xl items-center justify-center">
      <div className="grid w-full items-center gap-6 rounded-3xl bg-linear-to-br from-status-draft/70 via-background to-primary/10 p-6 sm:p-10 md:grid-cols-[1fr_minmax(0,24rem)]">
        <div className="mx-auto flex w-40 flex-col items-center gap-3 text-center sm:w-56 md:w-full md:max-w-72">
          <MochiPuff hero />
          <p className="hidden text-sm text-muted-foreground md:block">Templates, runs and tasks — all in one place.</p>
        </div>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>
              <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            </CardTitle>
            <CardDescription>Property workflows</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={login} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
              {message ? (
                <Alert variant="destructive">
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              ) : null}
              <Button type="submit" size="lg">
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
