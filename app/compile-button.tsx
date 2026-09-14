"use client";

import { useState } from "react";
import type { Game, PickSelection } from "@/lib/types";
import { Modal } from "@/app/modal";
import { GameListItem } from "@/app/game-list-item";
import { LockOverride } from "@/app/lock-override";

// Plain-text "Week N:" blocks, one per week present in `games`, each listing
// the team names picked to win in kickoff order. Games without a pick are
// left out entirely - the warning box in the modal is what surfaces those.
function buildCompiledText(games: Game[], picks: Record<string, PickSelection>): string {
  const weeks = new Map<number, string[]>();
  for (const game of games) {
    const pick = picks[game.id];
    if (!pick) continue;
    const winner = pick === "home" ? game.homeTeamName : game.awayTeamName;
    const winners = weeks.get(game.week) ?? [];
    winners.push(winner);
    weeks.set(game.week, winners);
  }

  return [...weeks.entries()]
    .sort(([a], [b]) => a - b)
    .map(([week, winners]) => `Week ${week}:\n${winners.join("\n")}`)
    .join("\n\n");
}

// Header control that compiles the selected week's picks into a plain-text
// list for pasting elsewhere. Ignores the team text filter - it always
// covers every game in the week, since the point is a complete weekly list,
// not whatever happens to be visible. Disabled when no single week is
// selected (see `disabled` below).
export function CompileButton({
  season,
  week,
  games,
  picks,
  lockOverride,
}: {
  season: number;
  week: number | undefined;
  games: Game[];
  picks: Record<string, PickSelection>;
  lockOverride: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Compiling across every week at once means every unpicked game - could
  // easily be 300+ - lands in the modal's warning box, which isn't usable.
  // Compiling only makes sense once a single week is selected.
  const disabled = week === undefined;

  // Recomputed from props on every render, so a pick made from the
  // GameListItem below - which round-trips through a Server Action and
  // revalidatePath("/") (see lib/pick-actions.ts) - flows back down as fresh
  // `picks` and immediately drops that game out of `missing` and into `text`,
  // with no separate client-side state to keep in sync.
  const missing = games.filter((game) => !picks[game.id]);
  const allPicked = missing.length === 0;
  const text = buildCompiledText(games, picks);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be blocked (permissions, non-HTTPS); nothing
      // useful to do beyond leaving the button as "Copy to clipboard".
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? "Select a week to compile picks" : undefined}
        className={`shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
          disabled
            ? "cursor-not-allowed border-black/8 text-zinc-400 dark:border-white/[.145] dark:text-zinc-500"
            : allPicked
              ? "cursor-pointer border-blue-600 bg-blue-600 text-white hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
              : "cursor-pointer border-blue-600 bg-transparent text-blue-600 hover:bg-blue-600/10 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400/10"
        }`}
      >
        Compile
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Compiled Picks"
        widthClassName="max-w-2xl"
        footer={
          <>
            <button
              type="button"
              onClick={handleCopy}
              className="cursor-pointer rounded-md border border-black/8 px-3 py-1.5 text-sm transition-colors hover:bg-black/5 dark:border-white/[.145] dark:hover:bg-white/5"
            >
              {copied ? "Copied!" : "Copy to clipboard"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer rounded-md border border-black/8 px-3 py-1.5 text-sm transition-colors hover:bg-black/5 dark:border-white/[.145] dark:hover:bg-white/5"
            >
              Close
            </button>
          </>
        }
      >
        {!allPicked && (
          <div className="rounded-md border border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">
                Missing {missing.length} pick{missing.length === 1 ? "" : "s"} - pick a winner
                below:
              </p>
              {/* Same control, same URL-backed state as the page's Lock
                  override toggle - flipping it here updates there too, and
                  vice versa. */}
              <div className="shrink-0">
                <LockOverride season={season} week={week} enabled={lockOverride} />
              </div>
            </div>
            <ul className="mt-2 flex flex-col gap-2">
              {missing.map((game) => (
                <GameListItem
                  key={game.id}
                  game={game}
                  pick={picks[game.id]}
                  lockOverride={lockOverride}
                />
              ))}
            </ul>
          </div>
        )}

        <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-md border border-black/8 bg-black/3 p-3 font-mono text-sm dark:border-white/[.145] dark:bg-white/3">
          {text || "No picks yet."}
        </pre>
      </Modal>
    </>
  );
}
