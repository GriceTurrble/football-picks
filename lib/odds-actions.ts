"use server";

import { refresh } from "next/cache";
import { syncOdds } from "@/lib/odds-sync";

/**
 * The "Refresh" button inside app/odds-modal.tsx: fetches odds for a single
 * competition from ESPN (see lib/odds-sync.ts) and refreshes the client
 * router, same pattern as the page-level refreshNow in lib/refresh-actions.ts
 * but scoped to one game instead of every season.
 */
export async function refreshOdds(gameId: string): Promise<void> {
  await syncOdds(gameId);
  refresh();
}
