"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MdRefresh } from "react-icons/md";
import { REFRESH_INTERVAL_MS } from "@/lib/constants";
import { refreshNow } from "@/lib/refresh-actions";

function formatRefreshedAt(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

interface RefreshStatusProps {
  /**
   * Whether any game is in progress or close enough to kickoff that its
   * status is worth re-checking (see lib/sync-window.ts). Only then does
   * the automatic tick run - otherwise the local data can't be stale, so
   * there's nothing to refresh toward.
   */
  active: boolean;
}

// Header control that keeps the page current: while `active`, it triggers
// router.refresh() (re-running the server component against the local DB,
// which lib/game-refresh.ts keeps synced with ESPN on the same interval)
// every REFRESH_INTERVAL_MS, and shows when that last happened. The button
// always works regardless of `active` - it calls the refreshNow server
// action, which forces an ESPN sync before refreshing - and restarts the
// interval, so a manual refresh always buys a full 5 minutes before the
// next automatic one.
export function RefreshStatus({ active }: RefreshStatusProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasPending = useRef(false);

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  const scheduleAutoRefresh = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = active ? setInterval(refresh, REFRESH_INTERVAL_MS) : null;
  }, [refresh, active]);

  useEffect(() => {
    setLastRefreshed(new Date());
    scheduleAutoRefresh();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [scheduleAutoRefresh]);

  // Once a refresh's transition settles, the server component has
  // re-rendered with fresh data - stamp the time it finished.
  useEffect(() => {
    if (wasPending.current && !isPending) {
      setLastRefreshed(new Date());
    }
    wasPending.current = isPending;
  }, [isPending]);

  function handleManualRefresh() {
    scheduleAutoRefresh();
    startTransition(async () => {
      await refreshNow();
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1 text-right text-xs text-zinc-500 dark:text-zinc-400">
      <button
        type="button"
        onClick={handleManualRefresh}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-full border border-black/8 px-3 py-1 font-medium text-zinc-700 disabled:opacity-60 dark:border-white/[.145] dark:text-zinc-200"
      >
        <MdRefresh className={isPending ? "animate-spin" : undefined} />
        Refresh
      </button>
      <span>{lastRefreshed ? `Last refreshed ${formatRefreshedAt(lastRefreshed)}` : "Refreshing…"}</span>
      <span>Auto-refreshes every 5 min while games are in progress.</span>
    </div>
  );
}
