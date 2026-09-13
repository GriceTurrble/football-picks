import Image from "next/image";
import { teamLogoSrc } from "@/lib/team-logo";
import { clearPick, pickWinner } from "@/lib/pick-actions";
import type { PickSelection } from "@/lib/types";

// Logo + team name, as a button for picking this team to win. Wrapped in its
// own <form> so the pick works via a plain Server Action post — no client
// component needed for the common case of "submit and re-render".
export function TeamBox({
  gameId,
  team,
  abbr,
  name,
  selected,
  disabled = false,
  override = false,
  className = "",
}: {
  gameId: string;
  team: PickSelection;
  abbr: string;
  name: string;
  selected: boolean;
  disabled?: boolean;
  override?: boolean;
  className?: string;
}) {
  // Clicking an already-selected team unselects it; otherwise it becomes the
  // pick.
  const action = selected
    ? clearPick.bind(null, gameId, override)
    : pickWinner.bind(null, gameId, team, override);

  return (
    <form action={action} className={`flex w-1/3 shrink-0 ${className}`}>
      <button
        type="submit"
        disabled={disabled}
        aria-pressed={selected}
        aria-label={selected ? `Unselect ${name}` : `Pick ${name} to win`}
        className={`flex w-full flex-1 flex-col items-center justify-center rounded-lg px-2 py-1.5 transition-colors ${
          selected ? "bg-foreground/10 ring-2 ring-foreground" : "hover:bg-black/5 dark:hover:bg-white/5"
        } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <Image src={teamLogoSrc(abbr)} alt={name} width={28} height={28} />
        <span className="w-full truncate text-center text-xs text-zinc-600 dark:text-zinc-400">
          {name}
        </span>
      </button>
    </form>
  );
}
