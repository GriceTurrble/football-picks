"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Odds } from "@/lib/types";
import { ensureOdds, getOdds, isFetchingOdds, subscribe } from "@/lib/odds";

export interface UseOddsResult {
  /** This game's odds, or null until they've been fetched (or if ESPN has none). */
  odds: Odds | null;
  /** True while the fetch is queued or in flight. */
  loading: boolean;
}

/**
 * Asks for one game's odds and follows them as they arrive.
 *
 * Mounting is what triggers the fetch, so only games that actually render
 * cost a request - and lib/odds.ts caps how many of those run at once. The
 * server and hydration renders both see "nothing cached", and React fills
 * each row in as its odds land.
 */
export function useOdds(gameId: string): UseOddsResult {
  const odds = useSyncExternalStore(
    subscribe,
    () => getOdds(gameId),
    () => null,
  );
  const loading = useSyncExternalStore(
    subscribe,
    () => isFetchingOdds(gameId),
    () => false,
  );

  useEffect(() => {
    ensureOdds([gameId]);
  }, [gameId]);

  return { odds, loading };
}
