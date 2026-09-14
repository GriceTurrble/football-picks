"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { Game } from "@/lib/types";
import { updateScoreTotal } from "@/lib/pick-actions";

// Mirrors the server's parsing in lib/pick-actions.ts#updateScoreTotal just
// closely enough to predict what it'll resolve to - empty or non-positive
// input clears the entry, otherwise it's the whole number typed. Used only
// to drive the optimistic update below; the server action is still the
// real validation.
function parseTotal(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

// Tiebreaker entry: what the user thinks the combined final score of both
// teams will be. Lives as plain text until clicked, at which point it
// becomes an editable input; leaving focus (or pressing Enter, which just
// blurs the input to trigger the same path) commits the value to the server
// and drops back to display mode. Needs client state for the edit toggle,
// unlike TeamBox's plain <form action> - there's no single "submit" moment
// to hang a form action off of.
export function ScoreTotal({
  game,
  total,
  disabled = false,
  override = false,
}: {
  game: Game;
  /** The saved entry, if any. 0 is treated the same as "no entry". */
  total?: number;
  disabled?: boolean;
  override?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  // Only meaningful while `editing` - seeded from `optimisticTotal` the
  // moment edit mode starts (see startEditing below), not synced
  // continuously, so a fresh `total` from the server (e.g. another tab's
  // edit rolling in via revalidatePath) is picked up for free by the plain
  // display below whenever the user isn't mid-edit here.
  const [draft, setDraft] = useState("");
  // Shows the just-committed value immediately instead of the stale `total`
  // prop while the Server Action round-trips (parse + write + the
  // revalidatePath that brings a fresh `total` back down) - without this,
  // display mode flashes the old number for a beat right after committing.
  // Reconciles back to the real `total` on its own once that finishes,
  // same as any other useOptimistic value.
  const [optimisticTotal, setOptimisticTotal] = useOptimistic(total);
  const [, startTransition] = useTransition();

  function startEditing() {
    setDraft(optimisticTotal ? String(optimisticTotal) : "");
    setEditing(true);
  }

  function commit(value: string) {
    setEditing(false);
    startTransition(async () => {
      setOptimisticTotal(parseTotal(value));
      await updateScoreTotal(game.id, value, override);
    });
  }

  // Dashed border marks the field as empty and clickable - it's a
  // discoverability hint, not a container, so it goes away once there's a
  // number to look at instead.
  const emptyBorderClass =
    "border border-dashed border-black/20 dark:border-white/30";

  // Only meaningful once the game has a score to compare against, and only
  // if an entry was actually made.
  const hasFinalScore =
    game.status !== "pre" && game.homeScore !== null && game.awayScore !== null;
  const diff =
    hasFinalScore && optimisticTotal
      ? Math.abs(optimisticTotal - (game.homeScore! + game.awayScore!))
      : null;

  return (
    <div className="flex flex-col items-center justify-center gap-0.5 px-1">
      {/* Same styling as the day-of-week section headers in game-list.tsx,
          just centered instead of left-aligned to suit this narrow column. */}
      <div className="text-center text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        Total
      </div>
      {editing ? (
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoFocus
          value={draft}
          onChange={(event) =>
            setDraft(event.target.value.replace(/[^0-9]/g, ""))
          }
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          aria-label="Score total entry"
          className={`w-full rounded-md bg-transparent text-center font-mono text-lg font-bold focus:outline-none ${
            draft ? "" : emptyBorderClass
          }`}
        />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={startEditing}
          aria-label={
            optimisticTotal
              ? `Edit score total entry of ${optimisticTotal}`
              : "Enter score total"
          }
          className={`w-full rounded-md px-1 text-center font-mono text-lg font-bold transition-colors ${
            optimisticTotal ? "" : emptyBorderClass
          } ${
            disabled
              ? "cursor-not-allowed"
              : "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
          }`}
        >
          {optimisticTotal || " "}
        </button>
      )}
      {diff !== null && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          DIFF {diff}
        </span>
      )}
    </div>
  );
}
