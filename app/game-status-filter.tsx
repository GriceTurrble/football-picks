"use client";

import { createContext, useContext, useState } from "react";
import type { GameStatus } from "@/lib/types";

export type StatusFilterValue = GameStatus | "all" | "bye";

interface GameStatusFilterContextValue {
  statusFilter: StatusFilterValue;
  setStatusFilter: (value: StatusFilterValue) => void;
}

const GameStatusFilterContext =
  createContext<GameStatusFilterContextValue | null>(null);

// Holds the selected game-status filter so the radio row (in the Filters
// dropdown) and the game list (below it) can share state without a round
// trip to the server - same pattern as TeamFilterProvider. Remount this
// provider (e.g. via `key={week}`) to reset it back to "all".
export function GameStatusFilterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  return (
    <GameStatusFilterContext.Provider value={{ statusFilter, setStatusFilter }}>
      {children}
    </GameStatusFilterContext.Provider>
  );
}

export function useGameStatusFilter(): GameStatusFilterContextValue {
  const context = useContext(GameStatusFilterContext);
  if (!context) {
    throw new Error(
      "useGameStatusFilter must be used within a GameStatusFilterProvider",
    );
  }
  return context;
}

const OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pre", label: "Upcoming" },
  { value: "in", label: "In Progress" },
  { value: "post", label: "Final" },
  { value: "bye", label: "Bye" },
];

// Small segmented control - a row of labels wrapping visually-hidden radio
// inputs, so it keeps native radio-group semantics/keyboard support while
// looking like a button bar.
export function GameStatusFilter() {
  const { statusFilter, setStatusFilter } = useGameStatusFilter();

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        Game progress
      </span>
      <div
        role="radiogroup"
        aria-label="Filter by game status"
        className="flex items-center gap-1 rounded-md border border-black/8 p-0.5 text-sm dark:border-white/25"
      >
        {OPTIONS.map((option) => {
          const checked = statusFilter === option.value;
          return (
            <label
              key={option.value}
              className={`cursor-pointer rounded px-2 py-1 whitespace-nowrap transition-colors select-none ${
                checked
                  ? "bg-foreground text-background"
                  : "text-zinc-600 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5"
              }`}
            >
              <input
                type="radio"
                name="game-status-filter"
                value={option.value}
                checked={checked}
                onChange={() => setStatusFilter(option.value)}
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
