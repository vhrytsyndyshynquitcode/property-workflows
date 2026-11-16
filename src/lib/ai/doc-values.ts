import { z } from "zod";
import { CATEGORIES, DOCUMENT_TYPES, LineItemSchema, URGENCIES, type Category, type Draft, type DocumentType, type LineItem, type Urgency } from "./schema";

// Правила зрізу 4, які перевіряє КОД, а не модель (openspec/specs/doc-parsing). Модель пропонує, сервер вирішує:
// тексти приміток, відмови й попередження — дослівно з AC PM; суму позицій рахує код; телефон нормалізує код.

export const MESSAGES = {
  notADocument: "This document is not a maintenance request or an estimate.", // AC-DOCAI-09
  emptyText: "Paste the text of a document", // AC-DOCAI-11
  notPlainText: "Only plain text files (.txt) are accepted", // AC-DOCAI-12
  unavailable: "The assistant is not available now. Fill in the values yourself.", // AC-DOCAI-13
  notEnoughRights: "Not enough rights", // AC-DOCAI-16
  reading: "Reading the document…", // AC-DOCAI-03
  notFound: "not found", // AC-DOCAI-06
} as const;

export const NOTES = {
  twoProblems: "the email has two problems", // AC-DOCAI-07
  ignoredInstructions: "the text contains instructions to the AI that were ignored", // AC-DOCAI-10
  possibleGasLeak: "possible gas leak", // golden case 6 (solomchaak/property-workflows-spec#40)
} as const;

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  maintenance_request: "Maintenance request",
  estimate: "Estimate",
};

/** AC-DOCAI-12: приймаємо лише простий текст (.txt); браузер читає файл у поле тексту. */
export function isPlainTextFile(name: string, type: string): boolean {
  return /\.txt$/i.test(name) && (type === "" || type === "text/plain");
}

/** Стан блоку «Parse a document» з відповіді дії (тип — як RequestState у src/app/runs/[id]/doc-actions.ts). */
type BlockState =
  | null
  | { kind: "denied" | "error" | "unavailable"; message: string }
  | Proposal;

/**
 * Що показує блок (AC-DOCAI-03, AC-DOCAI-05, AC-DOCAI-13): поки AI працює — «Reading the document…», кнопка вимкнена,
 * значень немає; після «Discard» стан знову null — блок порожній; недоступний помічник — порожня форма для ручного вводу.
 */
export function docBlockView(state: BlockState, pending: boolean) {
  if (pending) return { reading: MESSAGES.reading, proposeDisabled: true, message: null, form: "none" as const };
  const idle = { reading: null, proposeDisabled: false };
  if (state === null) return { ...idle, message: null, form: "none" as const };
  if (state.kind === "values") return { ...idle, message: null, form: "proposal" as const };
  if (state.kind === "unavailable") return { ...idle, message: state.message, form: "manual" as const };
  return { ...idle, message: state.message, form: "none" as const };
}

/** Найдовший текст, який іде до моделі (припущення розробника в proposal add-doc-parsing). */
export const MAX_TEXT_LENGTH = 20_000;

export type Proposal =
  | { kind: "refused"; message: string }
  | {
      kind: "values";
      documentType: DocumentType;
      phone: string | null;
      description: string | null;
      category: Category | null;
      urgency: Urgency | null;
      items: LineItem[];
      total: number | null;
      warning: string | null;
      notes: string[];
    };

/** Телефон у вигляді 555-0101 з будь-якого запису цифр («5550101», «555 01 01»); інакше — як є або null. */
export function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
}

const money = (n: number) => n.toFixed(2);
const cents = (n: number) => Math.round(n * 100);

/** Попередження AC-DOCAI-08: позиції дають іншу суму, ніж написано в документі. Числа не змінюємо. */
export function totalWarning(items: readonly LineItem[], total: number | null): string | null {
  if (total === null || items.length === 0) return null;
  const sum = items.reduce((acc, i) => acc + cents(i.quantity * i.unitPrice), 0) / 100;
  return cents(sum) === cents(total) ? null : `items add up to ${money(sum)}, the stated total is ${money(total)}`;
}

const blankToNull = (s: string | null) => (s && s.trim() ? s.trim() : null);

/** Відповідь моделі → те, що бачить людина в блоці (до будь-якого запису). */
export function toProposal(draft: Draft): Proposal {
  if (draft.status === "not_a_document" || draft.documentType === null) {
    return { kind: "refused", message: MESSAGES.notADocument };
  }
  const notes: string[] = [];
  if (draft.twoProblems) notes.push(NOTES.twoProblems);
  if (draft.possibleGasLeak) notes.push(NOTES.possibleGasLeak);
  if (draft.ignoredInstructions) notes.push(NOTES.ignoredInstructions);
  if (draft.documentType === "estimate") {
    const items = draft.items ?? [];
    return {
      kind: "values",
      documentType: "estimate",
      phone: null,
      description: null,
      category: null,
      urgency: null,
      items,
      total: draft.total,
      warning: totalWarning(items, draft.total),
      notes,
    };
  }
  return {
    kind: "values",
    documentType: "maintenance_request",
    phone: normalizePhone(draft.phone),
    description: blankToNull(draft.description),
    category: draft.category,
    urgency: draft.urgency,
    items: [],
    total: null,
    warning: null,
    notes,
  };
}

// ── Значення, які людина зберігає («Save values», AC-DOCAI-04, AC-DOCAI-13) ────────────────────────────────────
// Сервер перевіряє їх наново: клієнт може надіслати що завгодно.

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .transform((s) => (s.trim() ? s.trim() : null))
    .nullable();

export const SavedValuesSchema = z.discriminatedUnion("documentType", [
  z.object({
    documentType: z.literal("maintenance_request"),
    phone: optionalText(40),
    description: optionalText(600),
    category: z.enum(CATEGORIES).nullable(),
    urgency: z.enum(URGENCIES).nullable(),
  }),
  z.object({
    documentType: z.literal("estimate"),
    items: z.array(LineItemSchema).max(50),
    total: z.number().nonnegative().nullable(),
  }),
]);
export type SavedValues = z.infer<typeof SavedValuesSchema>;

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "");
const enumOrNull = <T extends string>(values: readonly T[], raw: string): T | null =>
  (values as readonly string[]).includes(raw) ? (raw as T) : null;
const numberOrNull = (raw: string) => (raw.trim() === "" ? null : Number(raw));

/** Поля форми блоку → значення для запису; null — форма невалідна (тип не обрано, число не число тощо). */
export function savedValuesFrom(formData: FormData): SavedValues | null {
  const documentType = enumOrNull(DOCUMENT_TYPES, field(formData, "documentType"));
  if (!documentType) return null;
  const raw =
    documentType === "maintenance_request"
      ? {
          documentType,
          phone: normalizePhone(field(formData, "phone")) ?? "",
          description: field(formData, "description"),
          category: enumOrNull(CATEGORIES, field(formData, "category")),
          urgency: enumOrNull(URGENCIES, field(formData, "urgency")),
        }
      : {
          documentType,
          items: formData
            .getAll("itemName")
            .map((name, i) => ({
              name: String(name).trim(),
              quantity: Number(formData.getAll("itemQuantity")[i]),
              unitPrice: Number(formData.getAll("itemUnitPrice")[i]),
            }))
            .filter((item) => item.name !== ""),
          total: numberOrNull(field(formData, "total")),
        };
  const parsed = SavedValuesSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Дата й час підтвердження за Києвом: «12 Nov 2026, 10:15» (припущення PM). */
export function formatConfirmedAt(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Kyiv",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("year")}, ${get("hour")}:${get("minute")}`;
}

/** Рядки «назва: значення» збереженого запису для сторінки запуску. */
export function recordLines(values: SavedValues): { label: string; value: string }[] {
  const show = (v: string | null) => v ?? MESSAGES.notFound;
  if (values.documentType === "maintenance_request") {
    return [
      { label: "Phone", value: show(values.phone) },
      { label: "Description", value: show(values.description) },
      { label: "Category", value: show(values.category) },
      { label: "Urgency", value: show(values.urgency) },
    ];
  }
  return [
    ...values.items.map((i) => ({ label: i.name, value: `${i.quantity} x ${money(i.unitPrice)}` })),
    { label: "Total", value: values.total === null ? MESSAGES.notFound : money(values.total) },
  ];
}
