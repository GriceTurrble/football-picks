"use client";

import { useCallback, useMemo } from "react";
import type { SeasonScope } from "@/lib/season-cache";
import { REGULAR_SEASON_WEEKS } from "@/lib/espn";
import { currentSeasonYear, listSeasons, listWeeks } from "@/lib/games";
import { refreshOddsFor } from "@/lib/odds";
import { listPicks, listScoreTotals } from "@/lib/picks";
import { anyNeedSync, needsSync } from "@/lib/sync-window";
import { usePickStore } from "@/lib/use-pick-store";
import { useSeasonData } from "@/lib/use-season-data";
import { SeasonSelect } from "@/app/season-select";
import { WeekSelect } from "@/app/week-select";
import { FilterDropdown } from "@/app/filter-dropdown";
import { DataDropdown } from "@/app/data-dropdown";
import { ActiveFilters } from "@/app/active-filters";
import {
  GameStatusFilterProvider,
  GameStatusFilter,
} from "@/app/game-status-filter";
import { GameDayFilterProvider, GameDayFilter } from "@/app/game-day-filter";
import { LockOverride } from "@/app/lock-override";
import { CompileButton } from "@/app/compile-button";
import { GameList } from "@/app/game-list";
import {
  TeamFilterProvider,
  TeamFilterInput,
  HideWhenTeamFilterExpanded,
} from "@/app/team-filter";
import { ProgressRefreshStatus } from "@/app/progress-refresh-status";
import { HelpButton } from "@/app/help-button";

// The week picker offers every regular-season week whenever only a single
// week is loaded - knowing which weeks exist would otherwise cost the second
// request a whole-season load makes. Pre-2021 seasons had fewer weeks; asking
// ESPN for one it doesn't have just comes back empty.
const ALL_WEEKS = Array.from(
  { length: REGULAR_SEASON_WEEKS },
  (_, index) => index + 1,
);

/**
 * The whole app: picks come from localStorage, the schedule comes from ESPN
 * for the session, and the URL names which season/week to look at.
 *
 * Default to the current week (one ESPN request) for the current season, and
 * to the whole season for a past one - a past-season visit is usually about
 * looking back, so the two-request season load is worth it there.
 */
export function PicksPage({
  requestedSeason,
  requestedWeek,
  lockOverride,
}: {
  requestedSeason?: number;
  requestedWeek?: number | "all";
  lockOverride: boolean;
}) {
  const store = usePickStore();
  const currentSeason = currentSeasonYear();

  const seasons = useMemo(
    () => listSeasons(currentSeason, store.picks),
    [currentSeason, store.picks],
  );
  // Only seasons the picker offers are reachable; anything else falls back to
  // the current one.
  const season =
    requestedSeason !== undefined && seasons.includes(requestedSeason)
      ? requestedSeason
      : currentSeason;

  const scope: SeasonScope =
    requestedWeek === "all"
      ? "all"
      : requestedWeek !== undefined
        ? requestedWeek
        : season === currentSeason
          ? "current"
          : "all";

  const { data, error, fetchedAt, refreshing, refresh } = useSeasonData(
    season,
    scope,
    store.ready,
  );

  // The cache already narrowed these to the selected week (or left them whole
  // for "all"), so no further filtering is needed here.
  const games = useMemo(() => data?.games ?? [], [data]);
  const byes = data?.byes ?? [];

  const gameIds = useMemo(() => games.map((game) => game.id), [games]);
  const picks = useMemo(
    () => listPicks(store.picks, gameIds),
    [store.picks, gameIds],
  );
  const scoreTotals = useMemo(
    () => listScoreTotals(store.picks, gameIds),
    [store.picks, gameIds],
  );

  // The single week on screen, or undefined when the whole season is. A
  // "current" scope only knows its week once ESPN answers.
  const selectedWeek =
    scope === "all"
      ? undefined
      : scope === "current"
        ? (data?.week ?? undefined)
        : scope;

  const weeks = useMemo(() => {
    if (!data) return [];
    return data.week === null ? listWeeks(data.games) : ALL_WEEKS;
  }, [data]);

  const syncActive = useMemo(() => anyNeedSync(games), [games]);

  const handleRefresh = useCallback(() => {
    refresh();
    refreshOddsFor(
      games.filter((game) => needsSync(game)).map((game) => game.id),
    );
  }, [refresh, games]);

  // Changing the week (or the scope behind it) clears the team/status/day
  // filters - they're scoped to whatever was on screen. Keyed on the scope
  // rather than the resolved week so the default "current" view doesn't
  // remount once ESPN names the week.
  const filterKey = String(scope);

  const emptyMessage =
    selectedWeek === undefined
      ? `No games found for the ${season} season.`
      : `No games found for week ${selectedWeek} of the ${season} season.`;

  return (
    <main className="mx-auto flex w-full max-w-4xl min-h-0 flex-1 flex-col gap-2 overflow-hidden pt-4 pb-24 px-2">
      <div className="flex items-center md:items-start justify-between gap-2">
        <div className="flex gap-2 items-baseline">
          <h1 className="text-xl md:text-2xl font-semibold whitespace-nowrap">
            Football Picks
          </h1>
          <p className="text-sm md:text-lg text-zinc-600 dark:text-zinc-400">
            {season} Season
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ProgressRefreshStatus
            active={syncActive}
            lastSyncedAt={fetchedAt}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
          <HelpButton />
        </div>
      </div>

      <TeamFilterProvider key={filterKey}>
        <GameStatusFilterProvider key={filterKey}>
          <GameDayFilterProvider key={filterKey}>
            <div className="relative flex items-center justify-between gap-2">
              <HideWhenTeamFilterExpanded>
                <CompileButton
                  season={season}
                  week={selectedWeek}
                  games={games}
                  picks={picks}
                  scoreTotals={scoreTotals}
                  lockOverride={lockOverride}
                />
                <WeekSelect season={season} weeks={weeks} week={selectedWeek} />
                <FilterDropdown>
                  <div className="grid grid-cols-2">
                    <SeasonSelect season={season} seasons={seasons} />
                  </div>
                  <GameStatusFilter />
                  <GameDayFilter />
                </FilterDropdown>
                <DataDropdown
                  season={season}
                  week={selectedWeek}
                  games={games}
                  picks={store.picks}
                />
              </HideWhenTeamFilterExpanded>
              <TeamFilterInput />
              <LockOverride
                season={season}
                week={requestedWeek}
                enabled={lockOverride}
              />
            </div>
            <ActiveFilters />

            {error && (
              <div className="flex items-start justify-between gap-2 rounded-md border border-red-500/40 bg-red-50 p-3 text-sm text-red-900 dark:bg-red-500/10 dark:text-red-300">
                <div className="min-w-0">
                  <p className="font-medium">
                    Couldn&apos;t load the {season} schedule from ESPN.
                  </p>
                  <p className="mt-1 break-words font-mono text-xs">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="shrink-0 cursor-pointer rounded-md border border-red-500/40 px-3 py-1 font-medium disabled:opacity-60"
                >
                  Retry
                </button>
              </div>
            )}

            {!data && !error && (
              <p className="px-2 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                Loading the {season} schedule from ESPN…
              </p>
            )}

            {data && games.length === 0 && byes.length === 0 && (
              <p className="px-2 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                {emptyMessage}
              </p>
            )}

            {data && (games.length > 0 || byes.length > 0) && (
              <GameList
                games={games}
                byes={byes}
                picks={picks}
                scoreTotals={scoreTotals}
                lockOverride={lockOverride}
              />
            )}
          </GameDayFilterProvider>
        </GameStatusFilterProvider>
      </TeamFilterProvider>
    </main>
  );
}
