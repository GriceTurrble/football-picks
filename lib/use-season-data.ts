"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { SeasonData } from "@/lib/types";
import {
  getSeasonStatus,
  getServerSeasonStatus,
  loadSeason,
  refreshSeason,
  subscribe,
  type SeasonScope,
  type SeasonStatus,
} from "@/lib/season-cache";

export interface UseSeasonDataResult {
  /** Cached or freshly fetched schedule; null until the first load resolves. */
  data: SeasonData | null;
  error: string | null;
  /** When the data was fetched from ESPN, or null if nothing is loaded yet. */
  fetchedAt: number | null;
  /** True while a manual refresh is in flight, even if old data is showing. */
  refreshing: boolean;
  /** Bypasses the session cache and re-fetches from ESPN. */
  refresh: () => void;
}

/**
 * Reads a season (or one week of it) from the session cache, loading it from
 * ESPN on first use. The cache is an external store, so the server and
 * hydration renders both see the empty status, and React swaps in cached data
 * as soon as the client reads it - no hydration mismatch, no effect-driven
 * state juggling.
 *
 * `enabled` holds the load back until the caller is ready - the page uses it
 * to wait for the persisted picks, which decide the default season.
 */
export function useSeasonData(
  season: number,
  scope: SeasonScope,
  enabled = true,
): UseSeasonDataResult {
  const status: SeasonStatus = useSyncExternalStore(
    subscribe,
    () => getSeasonStatus(season, scope),
    getServerSeasonStatus,
  );

  useEffect(() => {
    if (!enabled) return;
    void loadSeason(season, scope);
  }, [season, scope, enabled]);

  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(() => {
    setRefreshing(true);
    void refreshSeason(season, scope).finally(() => setRefreshing(false));
  }, [season, scope]);

  return {
    data: status.data,
    error: status.error,
    fetchedAt: status.fetchedAt,
    refreshing,
    refresh,
  };
}
