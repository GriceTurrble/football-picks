// Background loop that keeps already-seeded seasons up to date. It doesn't
// discover new seasons on its own — run `pnpm seed [season]` once to load a
// season for the first time (see app/page.tsx's empty state) — it just
// re-pulls kickoff times, statuses, and scores for whatever seasons already
// exist in the database.
import { listSeasons } from "@/lib/games";
import { syncSeason } from "@/lib/espn-sync";
import { REFRESH_INTERVAL_MS } from "@/lib/constants";

let started = false;

async function refreshAllSeasons(): Promise<void> {
  for (const season of listSeasons()) {
    try {
      const total = await syncSeason(season);
      console.log(`[game-refresh] synced ${total} games for ${season}`);
    } catch (err) {
      console.error(`[game-refresh] failed to sync season ${season}:`, err);
    }
  }
}

/**
 * Starts the refresh loop, if it isn't already running. Runs once
 * immediately, then every 5 minutes. Safe to call more than once — only the
 * first call schedules anything.
 */
export function startGameRefresh(): void {
  if (started) return;
  started = true;

  void refreshAllSeasons();
  // unref so this timer alone never keeps the process alive.
  setInterval(() => void refreshAllSeasons(), REFRESH_INTERVAL_MS).unref();
}
