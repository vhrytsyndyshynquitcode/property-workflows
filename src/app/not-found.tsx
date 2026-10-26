import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { MochiPuff } from "@/components/ui/mochi-puff";
import { AppShell } from "@/components/ui/page";

// Сторінка 404: той самий макет (AC-DSYS-02), талісман Mochi-Puff (ADR 0004) і дорога назад.
export default function NotFound() {
  return (
    <AppShell className="items-center justify-center">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl bg-linear-to-b from-status-draft/70 to-background p-8 text-center">
        <MochiPuff className="w-56" />
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-sm text-muted-foreground">This page does not exist or was moved.</p>
        <Link href="/" className={buttonVariants()}>
          Go to home
        </Link>
      </div>
    </AppShell>
  );
}
