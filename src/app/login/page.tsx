import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/ui/page";
import { login } from "./actions";

const ERRORS: Record<string, string> = {
  missing: "Enter your email and password.",
  invalid: "Email or password is incorrect.",
};

// Сторінка входу в тому самому макеті, що й решта застосунку (AC-DSYS-03, AC-EDITOR-09).
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <AppShell className="items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1 className="text-2xl font-semibold">Sign in</h1>
          </CardTitle>
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
    </AppShell>
  );
}
