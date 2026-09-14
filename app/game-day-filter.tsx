"use client";

import { createContext, useContext, useState } from "react";

/** Day of week as returned by Date#getDay() - 0 (Sunday) through 6 (Saturday). */
export type DayFilterValue = number | "all";

interface GameDayFilterContextValue {
  dayFilter: DayFilterValue;
  setDayFilter: (value: DayFilterValue) => void;
}

const GameDayFilterContext = createContext<GameDayFilterContextValue | null>(null);

// Holds the selected game-day filter so the radio row (in the Filters
// dropdown) and the game list (below it) can share state without a round
// trip to the server - same pattern as GameStatusFilterProvider. Remount this
// provider (e.g. via `key={week}`) to reset it back to "all".
export function GameDayFilterProvider({ children }: { children: React.ReactNode }) {
  const [dayFilter, setDayFilter] = useState<DayFilterValue>("all");
  return (
    <GameDayFilterContext.Provider value={{ dayFilter, setDayFilter }}>
      {children}
    </GameDayFilterContext.Provider>
  );
}

export function useGameDayFilter(): GameDayFilterContextValue {
  const context = useContext(GameDayFilterContext);
  if (!context) {
    throw new Error("useGameDayFilter must be used within a GameDayFilterProvider");
  }
  return context;
}

/** A kickoff's local day of week, matching the values used by OPTIONS below. */
export function kickoffDay(iso: string): number {
  return new Date(iso).getDay();
}

/** Full weekday names, indexed the same way as Date#getDay() (0 = Sunday). */
export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const OPTIONS: { value: DayFilterValue; label: string; name: string }[] = [
  { value: "all", label: "All", name: "All days" },
  ...WEEKDAY_NAMES.map((name, value) => ({ value, label: name.slice(0, 2), name })),
];

// Small segmented control - a row of labels wrapping visually-hidden radio
// inputs, so it keeps native radio-group semantics/keyboard support while
// looking like a button bar. Days are abbreviated two-letter labels (Su Mo Tu
// We Th Fr Sa), so each option carries a `title`/aria-label with the full day
// name for anyone who needs it spelled out.
export function GameDayFilter() {
  const { dayFilter, setDayFilter } = useGameDayFilter();

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Game day</span>
      <div
        role="radiogroup"
        aria-label="Filter by game day"
        className="flex items-center gap-1 rounded-md border border-black/8 p-0.5 text-sm dark:border-white/[.145]"
      >
        {OPTIONS.map((option) => {
          const checked = dayFilter === option.value;
          return (
            <label
              key={option.value}
              title={option.name}
              className={`cursor-pointer rounded px-2 py-1 whitespace-nowrap transition-colors select-none ${
                checked
                  ? "bg-foreground text-background"
                  : "text-zinc-600 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5"
              }`}
            >
              <input
                type="radio"
                name="game-day-filter"
                value={option.value}
                checked={checked}
                onChange={() => setDayFilter(option.value)}
                aria-label={option.name}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}
