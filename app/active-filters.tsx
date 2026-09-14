"use client";

import {
  useGameStatusFilter,
  type StatusFilterValue,
} from "@/app/game-status-filter";
import { useGameDayFilter, WEEKDAY_NAMES } from "@/app/game-day-filter";

const STATUS_LABELS: Record<Exclude<StatusFilterValue, "all">, string> = {
  pre: "Upcoming",
  in: "In Progress",
  post: "Final",
  bye: "Bye",
};

// Small strip beneath the control row that names whichever Filters-dropdown
// options are narrowing the list right now, each with its own X to clear it
// back to "all" - the dropdown itself closes after a pick, so without this
// there'd be no visible sign a filter is still on besides the list looking
// thin.
export function ActiveFilters() {
  const { statusFilter, setStatusFilter } = useGameStatusFilter();
  const { dayFilter, setDayFilter } = useGameDayFilter();

  // `type` mirrors the label each filter uses inside the dropdown itself
  // ("Game progress", "Game day"), so the chip reads as a continuation of
  // the same control rather than a re-description of it.
  const chips: {
    key: string;
    type: string;
    label: string;
    onClear: () => void;
  }[] = [];
  if (statusFilter !== "all") {
    chips.push({
      key: "status",
      type: "Game progress",
      label: STATUS_LABELS[statusFilter],
      onClear: () => setStatusFilter("all"),
    });
  }
  if (dayFilter !== "all") {
    chips.push({
      key: "day",
      type: "Game day",
      label: WEEKDAY_NAMES[dayFilter],
      onClear: () => setDayFilter("all"),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="flex items-center gap-1 rounded-full border border-black/8 py-0.5 pr-1 pl-2 dark:border-white/[.145]"
        >
          {chip.type}: <span className="font-semibold">{chip.label}</span>
          <button
            type="button"
            onClick={chip.onClear}
            aria-label={`Clear ${chip.type} filter`}
            className="cursor-pointer rounded-full px-1 text-zinc-500 hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
