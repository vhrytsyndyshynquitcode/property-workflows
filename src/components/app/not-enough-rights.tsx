import Link from "next/link";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { TEMPLATE_MESSAGES } from "@/lib/templates/domain";

// Відмова в тому самому макеті (AC-DSYS-02, AC-EDITOR-07): повідомлення й посилання назад, без вмісту сторінки.
// Вендору посилання веде до списку запусків — шаблонів він не відкриває (AC-VENDOR-08, AC-VENDOR-09).
export function NotEnoughRights({ back = { href: "/templates", label: TEMPLATE_MESSAGES.backToTemplates } }: {
  back?: { href: string; label: string };
}) {
  return (
    <>
      <Alert>
        <AlertTitle>{TEMPLATE_MESSAGES.notEnoughRights}</AlertTitle>
      </Alert>
      <Link href={back.href} className="text-sm text-primary underline-offset-4 hover:underline">
        {back.label}
      </Link>
    </>
  );
}

/** Куди повертає відмова: вендора — до запусків, інших — до шаблонів. */
export const RUNS_BACK = { href: "/runs", label: "All runs" };
