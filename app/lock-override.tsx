"use client";

import { useRouter } from "next/navigation";

interface LockOverrideProps {
  season: number;
  week: number | undefined;
  enabled: boolean;
}

// Bypasses the normal "picks lock at kickoff" rule for in-progress games.
// Lives in the URL (like the season/week filters) so it round-trips through
// server-rendered navigation without needing client state.
export function LockOverride({ season, week, enabled }: LockOverrideProps) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => {
          const params = new URLSearchParams({ season: String(season) });
          if (week !== undefined) params.set("week", String(week));
          if (event.target.checked) params.set("override", "1");
          router.push(`/?${params.toString()}`);
        }}
      />
      Lock override
    </label>
  );
}
