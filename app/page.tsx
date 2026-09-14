import Link from "next/link";
import { listGames, listSeasons, listWeeks } from "@/lib/games";
import { listPicks } from "@/lib/picks";
import { needsSync } from "@/lib/sync-window";
import { WeekSelect } from "@/app/week-select";
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
  const season = seasons.includes(requestedSeason) ? requestedSeason : seasons[0];

  const weeks = listWeeks(season);
  const requestedWeek = Number(firstParam(searchParams.week));
  const week = weeks.includes(requestedWeek) ? requestedWeek : undefined;

  const games = listGames(season, week);
  const picks = listPicks(games.map((game) => game.id));
  const lockOverride = firstParam(searchParams.override) === "1";

  // Auto-refresh only matters while ESPN's data for this season could
  // actually be changing; see lib/sync-window.ts. Checked against every
  // game in the season, not just the filtered week, so switching weeks
  // doesn't pause it.
  const syncActive = needsSync(week === undefined ? games : listGames(season));

  return (
    <main className="mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col gap-2 overflow-hidden py-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Football Picks</h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">{season} Season</p>
        </div>
        <RefreshStatus active={syncActive} />
      </div>

      {seasons.length > 1 && (
        <nav className="flex flex-wrap gap-2 text-sm">
          {seasons.map((s) => (
            <Link
              key={s}
              href={`/?season=${s}`}
              className={
                s === season
                  ? "rounded-full bg-foreground px-3 py-1 text-background"
                  : "rounded-full border border-black/8 px-3 py-1 dark:border-white/[.145]"
              }
            >
              {s}
            </Link>
          ))}
        </nav>
      )}

      {/* Keyed on week so the team filter clears when the week changes -
          there's no server round trip to reset it otherwise. */}
      <TeamFilterProvider key={week ?? "all"}>
        <div className="flex items-center justify-between gap-2">
          <CompileButton
            season={season}
            week={week}
            games={games}
            picks={picks}
            lockOverride={lockOverride}
          />
          <WeekSelect season={season} weeks={weeks} week={week} />
          <TeamFilterInput />
          <LockOverride season={season} week={week} enabled={lockOverride} />
        </div>

        <GameList games={games} picks={picks} lockOverride={lockOverride} />
      </TeamFilterProvider>
    </main>
  );
}
