// Background loop that keeps already-seeded seasons up to date. It doesn't
// discover new seasons on its own - run `pnpm seed [season]` once to load a
// season for the first time (see app/page.tsx's empty state) - it just
// re-pulls kickoff times, statuses, scores, and odds for whatever seasons
// already exist in the database.
//
// It ticks every REFRESH_INTERVAL_MS regardless, but only actually calls
// ESPN when needsSync says a game is likely to have changed - in progress,
// or within SYNC_WINDOW_MS of kickoff (see lib/sync-window.ts). `force`
// bypasses that check for the season's score/status sync only - used for the
// very first run on server start and for manual refreshes (see
// lib/refresh-actions.ts) - so a fresh server (or a manual "Refresh") always
// re-checks every season's scores regardless of staleness. Odds are a much
// bigger cost (one ESPN request per game, versus one per season for scores)
// and stay window-gated even then: a game months out or long since Final has
// nothing new to fetch, force or not.
//
// Both checks read `games` as it stood at the very start of the tick, before
// syncSeason runs - so a game that's still "in progress" as of that snapshot
// gets one last odds sync in the very tick that its score sync flips it to
// Final, and is correctly excluded from then on.
import { listSeasons, listGames } from "@/lib/games";
import { syncSeason } from "@/lib/espn-sync";
import { syncOdds } from "@/lib/odds-sync";
import { needsSync } from "@/lib/sync-window";
import { REFRESH_INTERVAL_MS } from "@/lib/constants";

let started = false;

async function refreshAllSeasons(force = false): Promise<void> {
  const now = Date.now();
  for (const season of listSeasons()) {
    const games = listGames(season);
    const oddsEligible = games.filter((game) => needsSync(game, now));
    if (!force && oddsEligible.length === 0) continue;

    try {
      // syncSeason stamps season_sync itself (see lib/sync-status.ts) - it
      // counts as "checked ESPN" for any caller, not just this loop.
      const total = await syncSeason(season);
      console.log(`[game-refresh] synced ${total} games for ${season}`);
    } catch (err) {
      console.error(`[game-refresh] failed to sync season ${season}:`, err);
    }

    for (const game of oddsEligible) {
      try {
        await syncOdds(game.id);
      } catch (err) {
        console.error(
          `[game-refresh] failed to sync odds for game ${game.id}:`,
          err,
        );
      }
    }
  }
}

/**
 * Starts the refresh loop, if it isn't already running. Runs once
 * immediately (forced, so a fresh server always starts with current data),
 * then every 5 minutes (gated by needsSync). Safe to call more than once -
 * only the first call schedules anything.
 */
export function startGameRefresh(): void {
  if (started) return;
  started = true;

  void refreshAllSeasons(true);
  // unref so this timer alone never keeps the process alive.
  setInterval(() => void refreshAllSeasons(), REFRESH_INTERVAL_MS).unref();
}

/** Forces an immediate sync of every season, regardless of game state. */
export function forceGameRefresh(): Promise<void> {
  return refreshAllSeasons(true);
}
