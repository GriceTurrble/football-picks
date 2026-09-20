import type { Game, Odds, PickSelection } from "@/lib/types";
import { TeamBox } from "@/app/team-box";
import { GameStatus } from "@/app/game-status";
import { ScoreTotal } from "@/app/score-total";
import { OddsButton } from "@/app/odds-button";

export function GameListItem({
  game,
  pick,
  scoreTotal,
  odds,
  lockOverride = false,
  showOddsButton = true,
}: {
  game: Game;
  pick?: PickSelection;
  /** The user's score-total tiebreaker entry for this game, if any. */
  scoreTotal?: number;
  /** This game's betting odds, if any have been fetched. */
  odds?: Odds | null;
  lockOverride?: boolean;
  /**
   * False when this GameListItem is itself being rendered inside the odds
   * modal (see app/odds-button.tsx) - showing the trigger there would just
   * open another copy of the same modal it's already in.
   */
  showOddsButton?: boolean;
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
      {/* 5-column layout: each TeamBox is 1 column, GameStatus spans 2 down
          the middle, and ScoreTotal is 1 column on the right. Grid items
          stretch to fill their column's width by default, so none of the
          children need their own width utility classes. */}
      <div className="grid grid-cols-5 items-stretch gap-2 rounded-lg border p-2 border-black/8 dark:border-white/[.145]">
        <TeamBox
          gameId={game.id}
          team="away"
          abbr={game.awayTeamId}
          name={game.awayTeamName}
          selected={pick === "away"}
          won={winner === "away"}
          disabled={locked}
          override={lockOverride}
        />
        <GameStatus game={game}>
          {showOddsButton && (
            <OddsButton
              game={game}
              odds={odds}
              pick={pick}
              scoreTotal={scoreTotal}
              lockOverride={lockOverride}
            />
          )}
        </GameStatus>
        <TeamBox
          gameId={game.id}
          team="home"
          abbr={game.homeTeamId}
          name={game.homeTeamName}
          selected={pick === "home"}
          won={winner === "home"}
          disabled={locked}
          override={lockOverride}
        />
        <ScoreTotal
          game={game}
          total={scoreTotal}
          disabled={locked}
          override={lockOverride}
        />
      </div>
    </li>
  );
}
