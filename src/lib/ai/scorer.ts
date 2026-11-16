import { Output, generateText, type LanguageModel } from "ai";
import { z } from "zod";
import type { Proposal } from "./doc-values";
import { JUDGE_INSTRUCTIONS, judgePrompt } from "./prompts/judge";

// Взято з koldovsky/2026-quitcode-10-ai-features-hw/materials/ai-feature/src/lib/ai/scorer.ts, адаптовано під зріз 4:
// порівнюємо те, що бачить людина в блоці (Proposal після правил коду), а не сиру відповідь моделі.

type ValuesProposal = Extract<Proposal, { kind: "values" }>;

/** Один golden case PM (solomchaak/property-workflows-spec#40): вхід → очікуване. Файл — tests/fixtures/golden/cases.json. */
export type GoldenCase = {
  id: string; // "GC-01"
  ac: string; // AC-DOCAI-… з вимоги PM, до якого належить кейс
  input: string;
  // Лише те, що PM фіксує точно: тип, телефон, категорія, терміновість, позиції, сума, попередження, примітки, відмова.
  expected:
    | { kind: "refused"; message: string }
    | ({ kind: "values" } & Partial<Omit<ValuesProposal, "kind" | "description">>);
  // Слова PM про опис (description): перевіряється за змістом LLM-суддею лише в живому eval.
  rubric?: string;
};

/** Детермінована частина: точний збіг усього, що PM зафіксував у кейсі. */
export function scoreFields(expected: GoldenCase["expected"], actual: Proposal) {
  const mismatches = (Object.keys(expected) as (keyof typeof expected)[])
    .filter((k) => JSON.stringify(expected[k]) !== JSON.stringify((actual as Record<string, unknown>)[k]))
    .map((k) => ({ field: k, expected: expected[k], actual: (actual as Record<string, unknown>)[k] }));
  return { pass: mismatches.length === 0, mismatches };
}

// Нечітка частина: LLM-суддя лише для опису, двійковий вердикт із причиною.
const Verdict = z.object({ pass: z.boolean(), reason: z.string().max(300) });
export type JudgeVerdict = z.infer<typeof Verdict>;

export async function judgeSummary(judge: LanguageModel, rubric: string, summary: string): Promise<JudgeVerdict> {
  const { output } = await generateText({
    model: judge,
    instructions: JUDGE_INSTRUCTIONS,
    prompt: judgePrompt(rubric, summary),
    output: Output.object({ name: "verdict", schema: Verdict }),
    temperature: 0,
    maxRetries: 0, // повтор на безкоштовному тарифі витрачає той самий денний ліміт
  });
  return output;
}

/** Частка успіху (pass rate) — визначення з WS8: прогін на задачах із відомими відповідями → бал. */
export function passRate(results: { pass: boolean }[]): { passed: number; total: number; rate: number } {
  const passed = results.filter((r) => r.pass).length;
  return { passed, total: results.length, rate: results.length ? passed / results.length : 0 };
}
