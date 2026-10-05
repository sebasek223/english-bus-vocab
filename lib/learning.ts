export type ReviewDirection = "en-to-cz" | "cz-to-en";

export interface DailyActivity {
  reviewed: number;
  goal: number;
}

export type DailyActivityLog = Record<string, DailyActivity>;

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