"use client";

import type { Game, PickSelection } from "@/lib/types";
import { GameListItem } from "@/app/game-list-item";
import { useTeamFilter } from "@/app/team-filter";

function matchesTeam(game: Game, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;

  return [game.homeTeamName, game.homeTeamAbbr, game.awayTeamName, game.awayTeamAbbr].some(
    (value) => value.toLowerCase().includes(needle)
  );
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
  const filtered = games.filter((game) => matchesTeam(game, search));

  return (
    <ul className="flex flex-col gap-2">
      {filtered.map((game) => (
        <GameListItem
          key={game.id}
          game={game}
          pick={picks[game.id]}
          lockOverride={lockOverride}
        />
      ))}
    </ul>
  );
}
