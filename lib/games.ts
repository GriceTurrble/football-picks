// Pure helpers over the schedule that lib/season-cache.ts holds for the
// session. Nothing here fetches or stores anything - it only narrows the
// arrays the cache already handed over.
import type { Game, PickEntry } from "@/lib/types";

/**
 * The NFL season a date belongs to. A season starts in September and runs
 * through the Super Bowl in February, so January and February still belong to
 * the previous calendar year's season - without this, a January visit would
 * default to a season that hasn't started yet.
 */
export function currentSeasonYear(now: Date = new Date()): number {
  return now.getMonth() <= 1 ? now.getFullYear() - 1 : now.getFullYear();
}

/**
 * Seasons to offer in the picker: the current one, plus any season that has a
 * saved pick. Picks are the only persistent data, so they're also the only
 * way a past season can be discovered without asking a server.
 */
export function listSeasons(
  currentSeason: number,
  picks: Record<string, PickEntry>,
): number[] {
  const seasons = new Set<number>([currentSeason]);
  for (const pick of Object.values(picks)) {
    if (Number.isInteger(pick.season) && pick.season > 0) {
      seasons.add(pick.season);
    }
  }
  return [...seasons].sort((a, b) => b - a);
}

/** Week numbers present in `games`, ascending. */
export function listWeeks(games: Game[]): number[] {
  const weeks = new Set<number>();
  for (const game of games) weeks.add(game.week);
  return [...weeks].sort((a, b) => a - b);
}

/**
 * Games for a season, optionally narrowed to one week. `games` arrives sorted
 * by week then kickoff (see lib/espn.ts), and filtering preserves that order.
 */
export function listGames(games: Game[], week?: number): Game[] {
  return week === undefined
    ? games
    : games.filter((game) => game.week === week);
}

/** A single game by its ESPN event id, or null if it isn't in the schedule. */
export function getGame(games: Game[], id: string): Game | null {
  return games.find((game) => game.id === id) ?? null;
}
