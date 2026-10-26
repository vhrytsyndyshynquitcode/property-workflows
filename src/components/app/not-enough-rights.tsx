import Link from "next/link";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { TEMPLATE_MESSAGES } from "@/lib/templates/domain";

// Відмова в тому самому макеті (AC-DSYS-02, AC-EDITOR-07): повідомлення й посилання назад, без вмісту сторінки.
export function NotEnoughRights() {
  return (
    <>
      <Alert>
        <AlertTitle>{TEMPLATE_MESSAGES.notEnoughRights}</AlertTitle>
      </Alert>
      <Link href="/templates" className="text-sm text-primary underline-offset-4 hover:underline">
        {TEMPLATE_MESSAGES.backToTemplates}
      </Link>
    </>
  );
}
