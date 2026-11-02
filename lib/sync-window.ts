// Decides whether ESPN's data for a set of games is likely still changing
// right now. app/picks-page.tsx uses anyNeedSync to gate the auto-refresh
// tick, and the Refresh button uses needsSync to pick which games' odds to
// re-fetch.
import type { Game } from "@/lib/types";
import { SYNC_WINDOW_MS } from "@/lib/constants";

/**
 * True when `game`'s score, status, and odds are all worth re-checking
 * against ESPN: it's in progress, or within SYNC_WINDOW_MS of kickoff.
 * Score/status refreshes cover the whole loaded week or season, while odds
 * are fetched one game at a time, so both run off this exact same check.
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
