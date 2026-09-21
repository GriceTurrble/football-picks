import { MdAlternateEmail } from "react-icons/md";
import { Game } from "@/lib/types";

export function GameScore({
  game,
  className = "",
}: {
  game: Game;
  className?: string;
}) {
  const showScore = game.status !== "pre";

  return (
    <div
      className={`flex justify-center items-center gap-2 font-mono font-bold text-lg ${className}`}
    >
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
  );
}
