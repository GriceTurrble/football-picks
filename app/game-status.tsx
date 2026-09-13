import { MdAlternateEmail } from "react-icons/md";
import type { Game } from "@/lib/types";
import { formatKickoff } from "@/lib/format";
import { StatusLabel } from "@/app/status-label";

// Sits between the two TeamBoxes: scores (or just the @ separator, before
// kickoff) on top, schedule details underneath.
export function GameStatus({ game }: { game: Game }) {
  const showScore = game.status !== "pre";

  return (
    <div className="flex w-40 shrink-0 flex-col items-center gap-0.5">
      <div className="flex items-center gap-2 font-mono font-bold text-lg">
        {showScore ? (
          <>
            <span>{game.awayScore}</span>
            <MdAlternateEmail className="text-sm text-zinc-500 dark:text-zinc-500" />
            <span>{game.homeScore}</span>
          </>
        ) : (
          <MdAlternateEmail className="text-sm text-zinc-500 dark:text-zinc-500" />
        )}
      </div>
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
          </div>
        )}
        <div>
          <strong>W{game.week}</strong> &middot; {formatKickoff(game.kickoff)}
        </div>
      </div>
    </div>
  );
}
