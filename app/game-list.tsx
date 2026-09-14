"use client";

import type { Game, PickSelection } from "@/lib/types";
import { GameListItem } from "@/app/game-list-item";
import { useTeamFilter } from "@/app/team-filter";
import { useGameStatusFilter } from "@/app/game-status-filter";
import { useGameDayFilter, kickoffDay, WEEKDAY_NAMES } from "@/app/game-day-filter";

function matchesTeam(game: Game, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;

  return [game.homeTeamName, game.homeTeamAbbr, game.awayTeamName, game.awayTeamAbbr].some(
    (value) => value.toLowerCase().includes(needle)
  );
}

interface DayGroup {
  day: string;
  games: Game[];
}

interface WeekGroup {
  week: number;
  days: DayGroup[];
}

// `games` arrives sorted by week then kickoff (see lib/games.ts), so a
// single pass that starts a new day-group whenever the weekday changes (and
// a new week-group whenever the week changes) yields chronological,
// non-empty groups - no header ever appears for a day, or a week, with
// nothing scheduled on it. Week-grouping (rather than a flat list of day
// groups) also gives the sticky "Week N" header a containing block that
// spans the whole week, so it stays pinned for exactly as long as that
// week's games are on screen - see the sticky/stacking styling below.
function groupGames(games: Game[]): WeekGroup[] {
  const weeks: WeekGroup[] = [];
  for (const game of games) {
    const day = WEEKDAY_NAMES[kickoffDay(game.kickoff)];
    let week = weeks[weeks.length - 1];
    if (!week || week.week !== game.week) {
      week = { week: game.week, days: [] };
      weeks.push(week);
    }
    const lastDay = week.days[week.days.length - 1];
    if (lastDay && lastDay.day === day) {
      lastDay.games.push(game);
    } else {
      week.days.push({ day, games: [game] });
    }
  }
  return weeks;
}

export function GameList({
  games,
  picks,
  lockOverride,
}: {
  games: Game[];
  picks: Record<string, PickSelection>;
  lockOverride: boolean;
}) {
  const { search } = useTeamFilter();
  const { statusFilter } = useGameStatusFilter();
  const { dayFilter } = useGameDayFilter();
  const filtered = games.filter(
    (game) =>
      matchesTeam(game, search) &&
      (statusFilter === "all" || game.status === statusFilter) &&
      (dayFilter === "all" || kickoffDay(game.kickoff) === dayFilter)
  );

  const weekGroups = groupGames(filtered);
  // A "Week N" header only adds information once more than one week is on
  // screen at a time (i.e. the Week selector is set to "All") - otherwise
  // it would just repeat the single week already named in the page header.
  const showWeekHeaders = weekGroups.length > 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
      {weekGroups.map((weekGroup) => (
        <section key={weekGroup.week} className="flex flex-col gap-2">
          {showWeekHeaders && (
            // Sticky to the scrolling list itself (the div above), not the
            // viewport. Same `top`/z-index on every week header is what lets
            // the browser stack them - each one stays pinned until the next
            // week's header reaches the top and takes its place.
            <h2 className="sticky top-0 z-10 bg-zinc-100 px-2 py-1 text-sm text-center font-semibold dark:bg-zinc-900">
              Week {weekGroup.week}
            </h2>
          )}
          {weekGroup.days.map((dayGroup) => (
            <div key={dayGroup.day} className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                {dayGroup.day}
              </h3>
              <ul className="flex flex-col gap-2">
                {dayGroup.games.map((game) => (
                  <GameListItem
                    key={game.id}
                    game={game}
                    pick={picks[game.id]}
                    lockOverride={lockOverride}
                  />
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
