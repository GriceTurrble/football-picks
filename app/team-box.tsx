import Image from "next/image";
import { teamLogoSrc } from "@/lib/team-logo";
import { clearPick, pickWinner } from "@/lib/pick-actions";
import type { PickSelection } from "@/lib/types";

// Logo + team name, as a button for picking this team to win. Wrapped in its
// own <form> so the pick works via a plain Server Action post - no client
// component needed for the common case of "submit and re-render".
export function TeamBox({
  gameId,
  team,
  abbr,
  name,
  selected,
  won = false,
  disabled = false,
  override = false,
  className = "",
  spread,
  favorite = false,
}: {
  gameId: string;
  team: PickSelection;
  abbr: string;
  name: string;
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
  // Clicking an already-selected team unselects it; otherwise it becomes the
  // pick.
  const action = selected
    ? clearPick.bind(null, gameId, override)
    : pickWinner.bind(null, gameId, team, override);

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
    <form action={action} className={`flex ${className}`}>
      <button
        type="submit"
        disabled={disabled}
        aria-pressed={selected}
        aria-label={selected ? `Unselect ${name}` : `Pick ${name} to win`}
        className={`flex w-full flex-1 flex-col items-center justify-center rounded-lg px-2 py-1.5 transition-colors ${stateClasses} ${
          disabled ? "cursor-not-allowed" : "cursor-pointer"
        }`}
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
    </form>
  );
}
