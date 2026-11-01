// Pure helpers over the bye weeks that lib/season-cache.ts holds for the
// session - either ESPN's own list (per-week fetch, see lib/espn.ts#fetchWeek)
// or one derived from a complete schedule (lib/espn.ts#deriveByes).
import type { ByeWeek } from "@/lib/types";

/** Teams with no game in a season, optionally narrowed to a single week. */
export function listByeWeeks(byes: ByeWeek[], week?: number): ByeWeek[] {
  return week === undefined ? byes : byes.filter((bye) => bye.week === week);
}
