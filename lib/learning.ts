export type ReviewDirection = "en-to-cz" | "cz-to-en";
export type PracticeMode = "classic" | "typing";

export interface ContextExample {
  en: string;
  cz: string;
}

export interface DailyActivity {
  reviewed: number;
  goal: number;
}

export type DailyActivityLog = Record<string, DailyActivity>;

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

export function migrateDailyActivityLog(rawLog: unknown, fallbackGoal: number): DailyActivityLog {
  if (typeof rawLog !== "object" || rawLog === null || Array.isArray(rawLog)) return {};

  const goalFallback = Math.max(1, fallbackGoal);
  return Object.entries(rawLog as Record<string, unknown>).reduce<DailyActivityLog>((log, [date, value]) => {
    if (typeof value === "number") {
      log[date] = { reviewed: Math.max(0, value), goal: goalFallback };
      return log;
    }

    if (typeof value === "object" && value !== null) {
      const activity = value as { reviewed?: unknown; goal?: unknown };
      if (typeof activity.reviewed === "number") {
        log[date] = {
          reviewed: Math.max(0, activity.reviewed),
          goal: typeof activity.goal === "number" && activity.goal > 0 ? activity.goal : goalFallback,
        };
      }
    }

    return log;
  }, {});
}

export function getActivityLevel(reviewCount: number, goal: number): number {
  if (reviewCount <= 0 || goal <= 0) return 0;
  const completion = reviewCount / goal;
  if (completion < 0.25) return 1;
  if (completion < 0.5) return 2;
  if (completion < 1) return 3;
  return 4;
}