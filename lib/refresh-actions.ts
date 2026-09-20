"use server";

import { refresh } from "next/cache";
import { forceGameRefresh } from "@/lib/game-refresh";

/**
 * The manual "Refresh" button in app/progress-refresh-status.tsx: unlike the
 * background loop's own tick, this always hits ESPN regardless of game
 * state, then refreshes the client router so the result shows up right
 * away.
 */
export async function refreshNow(): Promise<void> {
  await forceGameRefresh();
  refresh();
}
