import type { Game, PickSelection } from "@/lib/types";
import { TeamBox } from "@/app/team-box";
import { GameStatus } from "@/app/game-status";

export function GameListItem({
  game,
  pick,
  lockOverride = false,
}: {
  game: Game;
  pick?: PickSelection;
  lockOverride?: boolean;
}) {
  // Picks lock once a game kicks off - there's no point (or fairness) in
  // letting a pick change once the outcome is already in motion. The Lock
  // Override toggle lifts this for any game that's already started,
  // in-progress or final.
  const locked = game.status !== "pre" && !lockOverride;

  // Once a game is final (and didn't tie), figure out who won so TeamBox can
  // highlight it.
  const winner: PickSelection | null =
    game.status === "post" &&
    game.homeScore !== null &&
    game.awayScore !== null &&
    game.homeScore !== game.awayScore
      ? game.homeScore > game.awayScore
        ? "home"
        : "away"
      : null;

  return (
    <li>
      <div className="flex items-stretch justify-between rounded-lg border p-2 border-black/8 dark:border-white/[.145]">
        <TeamBox
          gameId={game.id}
          team="away"
          abbr={game.awayTeamAbbr}
          name={game.awayTeamName}
          selected={pick === "away"}
          won={winner === "away"}
          disabled={locked}
          override={lockOverride}
        />
        <GameStatus game={game} />
        <TeamBox
          gameId={game.id}
          team="home"
          abbr={game.homeTeamAbbr}
          name={game.homeTeamName}
          selected={pick === "home"}
          won={winner === "home"}
          disabled={locked}
          override={lockOverride}
        />
      </div>
    </li>
  );
}
