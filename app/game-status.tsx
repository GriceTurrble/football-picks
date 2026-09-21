import type { Game } from "@/lib/types";
import { formatKickoff } from "@/lib/format";
import { StatusLabel } from "@/app/status-label";
import { GameScore } from "./game-score";

// Sits between the two TeamBoxes: scores (or just the @ separator, before
// kickoff) on top, schedule details underneath. `children`, if given, renders
// below everything else - used by GameListItem for the odds trigger button,
// which needs game-list-level data (odds, team names) that GameStatus itself
// has no reason to know about.
export function GameStatus({
  game,
  children,
}: {
  game: Game;
  children?: React.ReactNode;
}) {
  return (
    <div className="md:order-2 col-span-3 md:col-span-2 row-2 md:row-1 flex flex-col items-center gap-0.5">
      <GameScore game={game} className="hidden md:flex" />
      <div className="flex flex-col gap-0.5 items-center text-center text-xs text-zinc-500 dark:text-white">
        {game.status !== "pre" && (
          <div className="flex items-center gap-1.5 font-semibold">
            {game.status === "in" && (
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
            )}
            <StatusLabel game={game} />
            <span className="md:hidden">
              &middot; <strong>W{game.week}</strong> &middot;{" "}
              {formatKickoff(game.kickoff)}
            </span>
          </div>
        )}
        <div className="hidden md:block">
          <strong> W{game.week}</strong> &middot; {formatKickoff(game.kickoff)}
        </div>
      </div>
      {children}
    </div>
  );
}
