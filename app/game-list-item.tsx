import Link from "next/link";
import type { Game } from "@/lib/types";
import { formatKickoff, statusLabel } from "@/lib/format";

export function GameListItem({ game }: { game: Game }) {
  return (
    <li>
      <Link
        href={`/games/${game.id}`}
        className="flex items-center justify-between gap-4 rounded-lg border border-black/8 px-4 py-3 hover:bg-black/3 dark:border-white/[.145] dark:hover:bg-white/6"
      >
        <span className="flex flex-col">
          <span className="font-medium">
            {game.awayTeamName} @ {game.homeTeamName}
          </span>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            Week {game.week} &middot; {formatKickoff(game.kickoff)}
          </span>
        </span>
        <span className="whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
          {game.status === "post"
            ? `${game.awayScore} - ${game.homeScore}`
            : statusLabel(game)}
        </span>
      </Link>
    </li>
  );
}
