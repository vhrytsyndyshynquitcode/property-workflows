import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { createBlobCreature } from "@/components/ui/mochi/blob-creature.js";
import { watchPasswordFocus } from "@/components/ui/mochi/password-focus";

// Сором'язливий режим талісмана (ADR 0004): поки людина вводить пароль, Mochi-Puff заплющує очі. Перевіряємо
// модель без WebGL: масштаб ока по Y — 1 (розплющене) … ~0.08 (заплющене).

type Creature = ReturnType<typeof createBlobCreature>;

// Очі — групи-півоти в «FacialFeatures» (кожна з чотирма мешами: рогівка, райдужка, два відблиски).
const eyeOpenness = (creature: Creature) =>
  creature.root
    .getObjectByName("FacialFeatures")!
    .children.filter((child) => child instanceof THREE.Group)
    .map((eye) => eye.scale.y);

const frames = (creature: Creature, count: number) => {
  for (let i = 0; i < count; i++) creature.update(1 / 60, new THREE.Vector2(0.5, 0.5), null, false);
};

describe("Mochi-Puff shy eyes", () => {
  it("closes both eyes while the password is being typed and opens them afterwards", () => {
    const creature = createBlobCreature();
    frames(creature, 5);
    expect(eyeOpenness(creature)).toEqual([1, 1]);

    creature.setEyesClosed(true);
    frames(creature, 30);
    for (const scale of eyeOpenness(creature)) expect(scale).toBeLessThan(0.1);

    creature.setEyesClosed(false);
    frames(creature, 30);
    for (const scale of eyeOpenness(creature)) expect(scale).toBeGreaterThan(0.95);
  });

  it("with reduced motion the eyes close and the gaze drops at once, without animation", () => {
    const creature = createBlobCreature();
    creature.setEyesClosed(true, true);
    frames(creature, 1);
    for (const scale of eyeOpenness(creature)) expect(scale).toBeCloseTo(0.08, 2);
    expect(creature.animState.currentLook.y).toBeCloseTo(-0.18, 5);

    creature.setEyesClosed(false, true);
    expect(creature.animState.currentLook.y).toBe(0);
  });
});

// Зв'язка сцени з формою: фокус у пароль → очі заплющені, фокус в email → розплющені. Штучний document на EventTarget.
class FakeDocument extends EventTarget {
  activeElement: Element | null = null;
  focus(element: { tagName: string; type?: string } | null) {
    if (this.activeElement) this.dispatchEvent(new Event("focusout"));
    this.activeElement = element as unknown as Element;
    if (element) this.dispatchEvent(new Event("focusin"));
  }
}

describe("password focus wiring", () => {
  it("reports typing a password on focus and stops on moving to email, reading focus after the event", () => {
    vi.useFakeTimers();
    try {
      const doc = new FakeDocument();
      const calls: boolean[] = [];
      const stop = watchPasswordFocus(doc as unknown as Document, (typing) => calls.push(typing));
      expect(calls).toEqual([false]); // одразу при монтуванні

      doc.focus({ tagName: "INPUT", type: "password" });
      vi.runAllTimers();
      expect(calls.at(-1)).toBe(true);

      doc.focus({ tagName: "INPUT", type: "email" });
      vi.runAllTimers();
      expect(calls.at(-1)).toBe(false);

      stop();
      doc.focus({ tagName: "INPUT", type: "password" });
      vi.runAllTimers();
      expect(calls.at(-1)).toBe(false); // після відписки сцена більше не реагує
    } finally {
      vi.useRealTimers();
    }
  });
});
