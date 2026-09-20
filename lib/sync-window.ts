// Shared between the server-side background sync loop
// (lib/game-refresh.ts) and app/page.tsx, which uses it to decide whether
// to let RefreshStatus auto-tick at all: whether ESPN's data for a set of
// games is likely still changing right now.
import type { Game, GameStatus } from "@/lib/types";
import { ODDS_SYNC_WINDOW_MS, PROGRESS_SYNC_WINDOW_MS } from "@/lib/constants";

/**
 * True when any game is in progress, or within SYNC_WINDOW_MS of its
 * kickoff without (yet) being marked in progress - the window where a
 * game's status is likely stale and worth re-checking against ESPN.
 */
export function needsProgressSync(
  games: Game[],
  now: number = Date.now(),
): boolean {
  return games.some((game) => {
    if (game.status === "in") return true;
    const kickoff = new Date(game.kickoff).getTime();
    return Math.abs(now - kickoff) <= PROGRESS_SYNC_WINDOW_MS;
  });
}

/**
 * Whether `game`'s odds are worth re-fetching from ESPN this tick (see
 * lib/game-refresh.ts). `priorStatus` is the game's status as of just before
 * this tick's score/status sync (or its current status, on ticks that skip
 * that sync entirely - see needsSync above), used only to catch the one
 * exception below:
 *
 * - In progress: always worth syncing - the line keeps moving, and this is
 *   also how a final settlement gets picked up the moment a game ends.
 * - Pre-kickoff: only within ODDS_SYNC_WINDOW_MS of kickoff - a game weeks
 *   out has nothing meaningfully different to fetch yet.
 * - Final: not worth syncing again in general (the line is locked in) -
 *   except immediately after the game refresh loop is the one that just
 *   flipped it from in-progress to Final this tick, which deserves one last
 *   sync to capture the closing/settlement values while they're fresh.
 */
export function needsOddsSync(
  game: Game,
  priorStatus: GameStatus | undefined,
  now: number = Date.now(),
): boolean {
  switch (game.status) {
    case "in":
      return true;
    case "pre": {
      const kickoff = new Date(game.kickoff).getTime();
      return kickoff - now <= ODDS_SYNC_WINDOW_MS;
    }
    case "post":
      return priorStatus === "in";
    default:
      return false;
  }
}
