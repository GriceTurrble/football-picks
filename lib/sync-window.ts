// Shared between the server-side background sync loop
// (lib/game-refresh.ts) and app/page.tsx, which uses it to decide whether
// to let ProgressRefreshStatus auto-tick at all: whether ESPN's data for a
// set of games is likely still changing right now.
import type { Game } from "@/lib/types";
import { SYNC_WINDOW_MS } from "@/lib/constants";

/**
 * True when `game`'s score, status, and odds are all worth re-checking
 * against ESPN: it's in progress, or within SYNC_WINDOW_MS of kickoff.
 * lib/game-refresh.ts checks this per game to decide what to sync each
 * tick - both a season's score/status and each eligible game's odds run off
 * this exact same check, so a game that's still "in progress" as of the
 * start of a tick gets one last odds sync in the very tick that its score
 * sync flips it to Final, and is correctly excluded from then on.
 */
export function needsSync(game: Game, now: number = Date.now()): boolean {
  if (game.status === "in") return true;
  if (game.status !== "pre") return false;
  const kickoff = new Date(game.kickoff).getTime();
  return kickoff - now <= SYNC_WINDOW_MS;
}

/** True when any game in `games` needsSync - see above. */
export function anyNeedSync(games: Game[], now: number = Date.now()): boolean {
  return games.some((game) => needsSync(game, now));
}
