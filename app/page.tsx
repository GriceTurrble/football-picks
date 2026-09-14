import { listGames, listSeasons, listWeeks } from "@/lib/games";
import { listByeWeeks } from "@/lib/bye-weeks";
import { listPicks, listScoreTotals } from "@/lib/picks";
import { needsSync } from "@/lib/sync-window";
import { getLastSyncedAt } from "@/lib/sync-status";
import { SeasonSelect } from "@/app/season-select";
import { WeekSelect } from "@/app/week-select";
import { FilterDropdown } from "@/app/filter-dropdown";
import { ActiveFilters } from "@/app/active-filters";
import {
  GameStatusFilterProvider,
  GameStatusFilter,
} from "@/app/game-status-filter";
import { GameDayFilterProvider, GameDayFilter } from "@/app/game-day-filter";
import { LockOverride } from "@/app/lock-override";
import { CompileButton } from "@/app/compile-button";
import { GameList } from "@/app/game-list";
import { TeamFilterProvider, TeamFilterInput } from "@/app/team-filter";
import { RefreshStatus } from "@/app/refresh-status";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const seasons = listSeasons();

  if (seasons.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-2xl font-semibold">Football Picks</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          No games loaded yet. Run{" "}
          <code className="rounded bg-black/6 px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/8">
            pnpm seed
          </code>{" "}
          to load a season&apos;s schedule.
        </p>
      </main>
    );
  }

  const requestedSeason = Number(firstParam(searchParams.season));
  const season = seasons.includes(requestedSeason)
    ? requestedSeason
    : seasons[0];

  const weeks = listWeeks(season);
  const requestedWeek = Number(firstParam(searchParams.week));
  const week = weeks.includes(requestedWeek) ? requestedWeek : undefined;

  const games = listGames(season, week);
  const byes = listByeWeeks(season, week);
  const picks = listPicks(games.map((game) => game.id));
  const scoreTotals = listScoreTotals(games.map((game) => game.id));
  const lockOverride = firstParam(searchParams.override) === "1";

  // Auto-refresh only matters while ESPN's data for this season could
  // actually be changing; see lib/sync-window.ts. Checked against every
  // game in the season, not just the filtered week, so switching weeks
  // doesn't pause it.
  const syncActive = needsSync(week === undefined ? games : listGames(season));
  const lastSyncedAt = getLastSyncedAt(season);

  return (
    <main className="mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col gap-2 overflow-hidden py-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Football Picks</h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            {season} Season
          </p>
        </div>
        <RefreshStatus active={syncActive} lastSyncedAt={lastSyncedAt} />
      </div>

      {/* Keyed on week so the team/status/day filters clear when the week
          changes - there's no server round trip to reset them otherwise. */}
      <TeamFilterProvider key={week ?? "all"}>
        <GameStatusFilterProvider key={week ?? "all"}>
          <GameDayFilterProvider key={week ?? "all"}>
            <div className="flex items-center justify-between gap-2">
              <CompileButton
                season={season}
                week={week}
                games={games}
                picks={picks}
                scoreTotals={scoreTotals}
                lockOverride={lockOverride}
              />
              <SeasonSelect season={season} seasons={seasons} />
              <WeekSelect season={season} weeks={weeks} week={week} />
              <FilterDropdown>
                <GameStatusFilter />
                <GameDayFilter />
              </FilterDropdown>
              <TeamFilterInput />
              <LockOverride
                season={season}
                week={week}
                enabled={lockOverride}
              />
            </div>
            <ActiveFilters />

            <GameList
              games={games}
              byes={byes}
              picks={picks}
              scoreTotals={scoreTotals}
              lockOverride={lockOverride}
            />
          </GameDayFilterProvider>
        </GameStatusFilterProvider>
      </TeamFilterProvider>
    </main>
  );
}
