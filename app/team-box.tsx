"use client";

import Image from "next/image";
import { teamLogoSrc } from "@/lib/team-logo";
import { clearPick, setPick } from "@/lib/picks";
import type { Game, PickSelection } from "@/lib/types";

// Logo + team name, as a button for picking this team to win. Clicking an
// already-selected team unselects it; otherwise it becomes the pick. The
// write goes straight to the pick store, so the highlighting below follows
// the props the page re-renders with.
export function TeamBox({
  game,
  team,
  selected,
  won = false,
  disabled = false,
  override = false,
  className = "",
  spread,
  favorite = false,
}: {
  game: Game;
  team: PickSelection;
  selected: boolean;
  /** This team won a completed game. */
  won?: boolean;
  disabled?: boolean;
  override?: boolean;
  className?: string;
  /** This team's current point spread (e.g. "-3", "+3.5"), if odds have been fetched. */
  spread?: string;
  /** Whether this team is currently favored to win, per the fetched odds. */
  favorite?: boolean;
}) {
  const abbr = team === "home" ? game.homeTeamId : game.awayTeamId;
  const name = team === "home" ? game.homeTeamName : game.awayTeamName;

  // Once a game is final, the winner's box gets a highlight: green if it was
  // the user's pick, orange if it wasn't (wrong pick or no pick at all).
  // Otherwise fall back to the plain selected/hover styling.
  const stateClasses = won
    ? selected
      ? "bg-green-100 ring-2 ring-green-600 dark:bg-green-900/40 dark:ring-green-500"
      : "bg-orange-100 dark:bg-orange-900/30"
    : selected
      ? "bg-foreground/10 ring-2 ring-foreground"
      : "hover:bg-black/5 dark:hover:bg-white/5";

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      aria-label={selected ? `Unselect ${name}` : `Pick ${name} to win`}
      onClick={() => {
        if (selected) {
          clearPick(game, override);
        } else {
          setPick(game, team, override);
        }
      }}
      className={`flex w-full flex-col items-center justify-center rounded-lg px-2 py-1.5 transition-colors ${stateClasses} ${
        disabled ? "cursor-not-allowed" : "cursor-pointer"
      } ${className}`}
    >
      <Image src={teamLogoSrc(abbr)} alt={name} width={28} height={28} />
      <span className="w-full truncate text-center text-xs text-zinc-600 dark:text-zinc-400">
        {name}
      </span>
      {spread && (
        <span className="w-full truncate text-center text-[0.65rem] font-semibold text-zinc-500 dark:text-zinc-500">
          {spread}
          {favorite ? " (favored)" : ""}
        </span>
      )}
    </button>
  );
}
