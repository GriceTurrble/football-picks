// Shared between the server-side background sync loop
// (lib/game-refresh.ts) and app/page.tsx, which uses it to decide whether
// to let RefreshStatus auto-tick at all: whether ESPN's data for a set of
// games is likely still changing right now.
import type { Game } from "@/lib/types";
import { SYNC_WINDOW_MS } from "@/lib/constants";

/**
 * True when any game is in progress, or within SYNC_WINDOW_MS of its
 * kickoff without (yet) being marked in progress - the window where a
 * game's status is likely stale and worth re-checking against ESPN.
 */
export function needsSync(games: Game[], now: number = Date.now()): boolean {
  return games.some((game) => {
    if (game.status === "in") return true;
    const kickoff = new Date(game.kickoff).getTime();
    return Math.abs(now - kickoff) <= SYNC_WINDOW_MS;
  });
}
