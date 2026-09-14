"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MdRefresh } from "react-icons/md";
import { REFRESH_INTERVAL_MS } from "@/lib/constants";
import { refreshNow } from "@/lib/refresh-actions";
import { formatRefreshedAt } from "@/lib/format";

interface RefreshStatusProps {
  /**
   * Whether any game is in progress or close enough to kickoff that its
   * status is worth re-checking (see lib/sync-window.ts). Only then does
   * the automatic tick run - otherwise the local data can't be stale, so
   * there's nothing to refresh toward.
   */
  active: boolean;
  /**
   * When lib/game-refresh.ts last actually finished checking this season
   * against ESPN (see lib/sync-status.ts) - the real moment the data could
   * have changed, not whenever this tab happened to notice. Null if the
   * background loop hasn't completed a sync for this season yet.
   */
  lastSyncedAt: string | null;
}

// Header control that keeps the page current: while `active`, it triggers
// router.refresh() (re-running the server component against the local DB,
// which lib/game-refresh.ts keeps synced with ESPN on the same interval)
// every REFRESH_INTERVAL_MS. The button always works regardless of `active`
// - it calls the refreshNow server action, which forces an ESPN sync before
// refreshing - and restarts the interval, so a manual refresh always buys a
// full 5 minutes before the next automatic one.
//
// `lastSyncedAt` comes from the database rather than being guessed
// client-side from "when did my router.refresh() transition settle" - that
// looked plausible but was wrong in exactly the case it mattered: outside
// an active sync window there's nothing to observe settling until the
// background loop's next real sync, which could be a long way off, leaving
// the old approach stuck showing "Refreshing…" indefinitely.
export function RefreshStatus({ active, lastSyncedAt }: RefreshStatusProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    scheduleAutoRefresh();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [scheduleAutoRefresh]);

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
        className="cursor-pointer flex items-center gap-1.5 rounded-full border border-black/8 px-3 py-1 font-medium text-zinc-700 disabled:opacity-60 dark:border-white/[.145] dark:text-zinc-200"
      >
        <MdRefresh className={isPending ? "animate-spin" : undefined} />
        Refresh
      </button>
      <span>
        {isPending
          ? "Refreshing…"
          : lastSyncedAt
            ? `Last refreshed ${formatRefreshedAt(lastSyncedAt)}`
            : "Not yet refreshed"}
      </span>
      <span>Auto-refreshes from ESPN Scoreboard API every 5 min while games in progress.</span>
    </div>
  );
}
