"use client";

import { useCallback, useEffect, useRef } from "react";
import { MdRefresh } from "react-icons/md";
import { REFRESH_INTERVAL_MS } from "@/lib/constants";
import { ToolTipLabel } from "@/app/tooltip";
import { formatRefreshedAt } from "@/lib/format";

interface ProgressRefreshStatusProps {
  /**
   * Whether any game on screen is in progress or close enough to kickoff
   * that its status is worth re-checking (see lib/sync-window.ts). Only then
   * does the automatic tick run - otherwise the loaded data can't be stale,
   * so there's nothing to refresh toward.
   */
  active: boolean;
  /**
   * When the schedule currently on screen was last fetched from ESPN. Null
   * until the first successful load.
   */
  lastSyncedAt: number | null;
  /** True while a refresh (manual or automatic) is in flight. */
  refreshing: boolean;
  /** Re-fetches the schedule and current odds from ESPN. */
  onRefresh: () => void;
}

// Header control that keeps the page current: while `active`, it asks for a
// refresh every REFRESH_INTERVAL_MS. The button always works regardless of
// `active` and restarts the interval, so a manual refresh buys a full
// interval before the next automatic one.
//
// `lastSyncedAt` is the cache's own fetch time rather than "when my refresh
// settled", so the label reflects when data actually arrived from ESPN.
export function ProgressRefreshStatus({
  active,
  lastSyncedAt,
  refreshing,
  onRefresh,
}: ProgressRefreshStatusProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // The page rebuilds onRefresh whenever its games change; keeping it in a
  // ref means a new identity doesn't tear down and restart the interval.
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const scheduleAutoRefresh = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = active
      ? setInterval(() => onRefreshRef.current(), REFRESH_INTERVAL_MS)
      : null;
  }, [active]);

  useEffect(() => {
    scheduleAutoRefresh();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [scheduleAutoRefresh]);

  function handleManualRefresh() {
    scheduleAutoRefresh();
    onRefresh();
  }

  return (
    <div className="flex flex-row items-center justify-end gap-1 text-right text-xs text-zinc-500 dark:text-zinc-400">
      <ToolTipLabel
        label={
          refreshing
            ? "Refreshing…"
            : lastSyncedAt
              ? `Refreshed ${formatRefreshedAt(lastSyncedAt)}`
              : "Not yet refreshed"
        }
        tip="Auto-refreshes from ESPN Scoreboard API every 5 min while games in progress."
        className="hidden sm:inline"
      />
      <button
        type="button"
        onClick={handleManualRefresh}
        disabled={refreshing}
        className="cursor-pointer flex items-center gap-1.5 rounded-full border border-black/8 px-3 py-1 font-medium text-zinc-700 disabled:opacity-60 dark:border-white/25 dark:text-zinc-200"
      >
        <MdRefresh className={refreshing ? "animate-spin" : undefined} />
        Refresh
      </button>
    </div>
  );
}
