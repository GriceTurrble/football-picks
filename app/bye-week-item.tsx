import Image from "next/image";
import { teamLogoSrc } from "@/lib/team-logo";
import type { ByeWeek } from "@/lib/types";

// A team with no game this week. Same footprint as a GameListItem (rounded
// border, same padding) so it reads as part of the same list, but there's
// nothing to interact with - just the logo, name, and a "BYE" label.
export function ByeWeekItem({ teamId, teamName }: Pick<ByeWeek, "teamId" | "teamName">) {
  return (
    <li>
      <div className="flex items-center justify-center gap-3 rounded-lg border p-2 border-black/8 dark:border-white/[.145]">
        <Image src={teamLogoSrc(teamId)} alt={teamName} width={28} height={28} />
        <span className="text-sm font-medium">{teamName}</span>
        <span className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          BYE
        </span>
      </div>
    </li>
  );
}
