"use client";

import { useRouter } from "next/navigation";

interface WeekSelectProps {
  season: number;
  weeks: number[];
  week: number | undefined;
}

export function WeekSelect({ season, weeks, week }: WeekSelectProps) {
  const router = useRouter();

  return (
    <select
      aria-label="Filter by week"
      className="w-20 shrink-0 rounded-md border border-black/8 bg-transparent px-2 py-1.5 text-sm dark:border-white/[.145]"
      value={week ?? "all"}
      onChange={(event) => {
        const value = event.target.value;
        const query =
          value === "all" ? `season=${season}` : `season=${season}&week=${value}`;
        router.push(`/?${query}`);
      }}
    >
      <option value="all">All</option>
      {weeks.map((w) => (
        <option key={w} value={w}>
          W{w}
        </option>
      ))}
    </select>
  );
}
