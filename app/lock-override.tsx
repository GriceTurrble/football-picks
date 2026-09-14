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
    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 select-none dark:text-zinc-400">
      {/* Real checkbox for semantics/keyboard support, just visually
          hidden - the track + thumb below are what's actually shown, driven
          off its checked state via the peer-* variants. */}
      <span className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-zinc-300 transition-colors has-checked:bg-blue-600 has-focus-visible:ring-2 has-focus-visible:ring-blue-500 has-focus-visible:ring-offset-2 dark:bg-zinc-600 dark:has-checked:bg-blue-500">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            const params = new URLSearchParams({ season: String(season) });
            if (week !== undefined) params.set("week", String(week));
            if (event.target.checked) params.set("override", "1");
            router.push(`/?${params.toString()}`);
          }}
          className="peer sr-only"
        />
        <span className="pointer-events-none inline-block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
      Override locks
    </label>
  );
}
