"use client";

import { useRouter } from "next/navigation";

interface SeasonSelectProps {
  season: number;
  seasons: number[];
}

export function SeasonSelect({ season, seasons }: SeasonSelectProps) {
  const router = useRouter();

  return (
    <div className="flex flex-row items-center gap-1">
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        Season
      </span>
      <select
        aria-label="Filter by season"
        className="w-20 shrink-0 rounded-md border border-black/8 bg-transparent px-2 py-1.5 text-sm dark:border-white/25 dark:hover:border-white/50"
        value={season}
        onChange={(event) => {
          // Changing season drops week/status/override, same as the old
          // season pill links did - a week from one season has no meaning in
          // another.
          router.push(`/?season=${event.target.value}`);
        }}
      >
        {seasons.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
