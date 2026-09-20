"use client";

import type { ByeWeek, Game, Odds, PickSelection } from "@/lib/types";
import { GameListItem } from "@/app/game-list-item";
import { ByeWeekItem } from "@/app/bye-week-item";
import { useTeamFilter } from "@/app/team-filter";
import { useGameStatusFilter } from "@/app/game-status-filter";
import {
  useGameDayFilter,
  kickoffDay,
  WEEKDAY_NAMES,
} from "@/app/game-day-filter";

function matchesNeedle(value: string, needle: string): boolean {
  return value.toLowerCase().includes(needle);
}

function matchesTeam(game: Game, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;

  return [
    game.homeTeamName,
    game.homeTeamId,
    game.awayTeamName,
    game.awayTeamId,
  ].some((value) => matchesNeedle(value, needle));
}

function matchesBye(bye: ByeWeek, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;

  return [bye.teamName, bye.teamId].some((value) =>
    matchesNeedle(value, needle),
  );
}

interface DayGroup {
  day: string;
  games: Game[];
}

interface WeekGroup {
  week: number;
  byes: ByeWeek[];
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
//
// Byes carry a week number but no kickoff/day, so they're merged in by week
// only, ahead of that week's day groups. Filtering can thin one side out
// from under the other, so a week can end up with byes and no games (or
// vice versa) - see GameList below.
function groupGames(games: Game[], byes: ByeWeek[]): WeekGroup[] {
  const weeks = new Map<number, WeekGroup>();

  function weekGroup(week: number): WeekGroup {
    let group = weeks.get(week);
    if (!group) {
      group = { week, byes: [], days: [] };
      weeks.set(week, group);
    }
    return group;
  }

  for (const game of games) {
    const day = WEEKDAY_NAMES[kickoffDay(game.kickoff)];
    const week = weekGroup(game.week);
    const lastDay = week.days[week.days.length - 1];
    if (lastDay && lastDay.day === day) {
      lastDay.games.push(game);
    } else {
      week.days.push({ day, games: [game] });
    }
  }

  for (const bye of byes) {
    weekGroup(bye.week).byes.push(bye);
  }

  return [...weeks.values()].sort((a, b) => a.week - b.week);
}

export function GameList({
  games,
  byes,
  picks,
  scoreTotals,
  odds,
  lockOverride,
}: {
  games: Game[];
  byes: ByeWeek[];
  picks: Record<string, PickSelection>;
  scoreTotals: Record<string, number>;
  odds: Record<string, Odds>;
  lockOverride: boolean;
}) {
  const { search } = useTeamFilter();
  const { statusFilter } = useGameStatusFilter();
  const { dayFilter } = useGameDayFilter();
  const filtered = games.filter(
    (game) =>
      matchesTeam(game, search) &&
      (statusFilter === "all" || game.status === statusFilter) &&
      (dayFilter === "all" || kickoffDay(game.kickoff) === dayFilter),
  );

  // Byes have no day of their own to filter by, and no progress either -
  // except "Bye" itself, the one status option that names them directly, so
  // choosing it shows every bye regardless of the day filter. Otherwise they
  // only show up for "All"/"All" - unless the team search matches one, in
  // which case the match takes priority over both.
  const searchActive = search.trim() !== "";
  const filteredByes = byes.filter((bye) => {
    if (!matchesBye(bye, search)) return false;
    if (searchActive || statusFilter === "bye") return true;
    return statusFilter === "all" && dayFilter === "all";
  });

  const weekGroups = groupGames(filtered, filteredByes);
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
          {weekGroup.byes.length > 0 && (
            <ul className="flex flex-col gap-2">
              {weekGroup.byes.map((bye) => (
                <ByeWeekItem
                  key={bye.teamId}
                  teamId={bye.teamId}
                  teamName={bye.teamName}
                />
              ))}
            </ul>
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
                    scoreTotal={scoreTotals[game.id]}
                    odds={odds[game.id]}
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
