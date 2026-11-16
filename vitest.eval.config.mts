import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

// `npm run eval` — живий прогін golden cases на безкоштовних моделях. Ніколи не частина `npm test` / CI:
// основний vitest.config.mts бере лише *.test.ts(x), а цей — лише evals/**/*.eval.ts.
// Взято з koldovsky/2026-quitcode-10-ai-features-hw/materials/ai-feature; `loadEnv` з vite замінено вбудованим у Node
// process.loadEnvFile (vite — не пряма залежність проєкту).
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["evals/**/*.eval.ts"],
    fileParallelism: false, // по одному запиту: безкоштовний тариф — 20 запитів/хв
    testTimeout: 120_000,
    hookTimeout: 30_000,
    expect: { requireAssertions: true },
  },
});
