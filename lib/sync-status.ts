// Relative (not "@/lib/db") because this file is reachable from
// lib/espn-sync.ts, which is also imported by scripts/seed.mts under plain
// `node` - no bundler there to resolve the "@/*" alias.
import { getDb } from "./db.ts";

/**
 * Records that `season` was just successfully checked against ESPN. Called
 * from lib/game-refresh.ts right after a sync completes - this is the
 * actual moment the local data could have changed, as opposed to whenever a
 * particular browser tab next notices (a page load, a `router.refresh()`
 * settling, etc.), which is all a client-side timestamp could ever really
 * mean.
 */
export function markSynced(season: number, at: string = new Date().toISOString()): void {
  getDb()
    .prepare(
      `INSERT INTO season_sync (season, synced_at) VALUES (?, ?)
       ON CONFLICT(season) DO UPDATE SET synced_at = excluded.synced_at`
    )
    .run(season, at);
}

/** When `season` was last successfully synced against ESPN, or null if never. */
export function getLastSyncedAt(season: number): string | null {
  const row = getDb()
    .prepare("SELECT synced_at FROM season_sync WHERE season = ?")
    .get(season) as { synced_at: string } | undefined;
  return row?.synced_at ?? null;
}
