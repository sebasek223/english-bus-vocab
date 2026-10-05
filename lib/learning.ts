export type ReviewDirection = "en-to-cz" | "cz-to-en";
export type PracticeMode = "classic" | "typing";

export interface ContextExample {
  en: string;
  cz: string;
}

export const LEARNING_CONFIG = {
  clozeEnabled: true,
  typingEnabled: true,
  bidirectionalEnabled: true,
  typingEvery: 3,
  clozeBlank: "_____",
} as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildClozeSentence(
  examples: ContextExample[],
  targetWord: string,
  targetTranslation: string,
  direction: ReviewDirection
): string {
  const candidates = direction === "en-to-cz"
    ? [targetWord]
    : targetTranslation.split(/[,;/|]/).map((part) => part.trim()).filter(Boolean);
  const sentences = examples
    .map((example) => direction === "en-to-cz" ? example.en : example.cz)
    .filter(Boolean);

  if (!LEARNING_CONFIG.clozeEnabled) {
    return sentences[0] || targetTranslation;
  }

  for (const sentence of sentences) {
    for (const candidate of candidates) {
      const targetPattern = new RegExp(
        `(^|[^\\p{L}\\p{N}])(${escapeRegExp(candidate)})(?=$|[^\\p{L}\\p{N}])`,
        "iu"
      );
      if (targetPattern.test(sentence)) {
        return sentence.replace(targetPattern, `$1${LEARNING_CONFIG.clozeBlank}`);
      }
    }
  }

  return direction === "en-to-cz"
    ? `Doplň chybějící slovo: ${LEARNING_CONFIG.clozeBlank}`
    : targetTranslation;
}

export function isCorrectAnswer(input: string, expected: string): boolean {
  return input.trim().toLowerCase() === expected.trim().toLowerCase();
}

export function getPracticeMode(reviewOrdinal: number): PracticeMode {
  return LEARNING_CONFIG.typingEnabled && reviewOrdinal > 0 && reviewOrdinal % LEARNING_CONFIG.typingEvery === 0
    ? "typing"
    : "classic";
}

export function getNextDirection(direction: ReviewDirection): ReviewDirection {
  if (!LEARNING_CONFIG.bidirectionalEnabled) return "en-to-cz";
  return direction === "en-to-cz" ? "cz-to-en" : "en-to-cz";
}

export function getActivityLevel(reviewCount: number): number {
  if (reviewCount <= 0) return 0;
  if (reviewCount < 3) return 1;
  if (reviewCount < 6) return 2;
  if (reviewCount < 10) return 3;
  return 4;
}