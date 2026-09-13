import Link from "next/link";
import { notFound } from "next/navigation";
import { getGame } from "@/lib/games";
import { formatKickoff, statusLabel } from "@/lib/format";

export default async function GamePage(props: PageProps<"/games/[id]">) {
  const { id } = await props.params;
  const game = getGame(id);

  if (!game) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <Link
        href={`/?season=${game.season}&week=${game.week}`}
        className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        &larr; Back to Week {game.week}
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">
          {game.awayTeamName} @ {game.homeTeamName}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Week {game.week} &middot; {formatKickoff(game.kickoff)}
        </p>
        {game.venue && (
          <p className="text-zinc-600 dark:text-zinc-400">{game.venue}</p>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-black/8 p-4 dark:border-white/[.145]">
        <div className="flex items-center justify-between">
          <span>{game.awayTeamName}</span>
          <span className="font-mono text-lg">{game.awayScore ?? "-"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>{game.homeTeamName}</span>
          <span className="font-mono text-lg">{game.homeScore ?? "-"}</span>
        </div>
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Status: {statusLabel(game)}
      </p>
    </main>
  );
}
