"use client";

import { useState } from "react";
import type { Game } from "@/lib/types";
import { updateScoreTotal } from "@/lib/picks";

// Tiebreaker entry: what the user thinks the combined final score of both
// teams will be. Lives as plain text until clicked, at which point it
// becomes an editable input; leaving focus (or pressing Enter, which just
// blurs the input to trigger the same path) commits the value to the pick
// store and drops back to display mode.
//
// The write is synchronous, so display mode can read the `total` prop
// directly - the page re-renders from the store as soon as it changes.
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
  // Only meaningful while `editing`, read from `total` the moment edit mode
  // starts rather than synced continuously - a change from another tab shows
  // up for free through the plain display below whenever the user isn't
  // mid-edit here.
  const [draft, setDraft] = useState("");

  function startEditing() {
    setDraft(total ? String(total) : "");
    setEditing(true);
  }

  function commit(value: string) {
    setEditing(false);
    try {
      updateScoreTotal(game, value, override);
    } catch (error) {
      // The input only accepts digits, so this is a guard rail rather than an
      // expected path.
      console.error("[score-total] failed to save:", error);
    }
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
    hasFinalScore && total
      ? Math.abs(total - (game.homeScore! + game.awayScore!))
      : null;

  return (
    <div className="col-2 md:col-5 flex flex-col items-center justify-center gap-0.5 px-1">
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
            total ? `Edit score total entry of ${total}` : "Enter score total"
          }
          className={`w-full rounded-md px-1 text-center font-mono text-lg font-bold transition-colors ${
            total ? "" : emptyBorderClass
          } ${
            disabled
              ? "cursor-not-allowed"
              : "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
          }`}
        >
          {total || " "}
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
