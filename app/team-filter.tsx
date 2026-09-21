"use client";

import { createContext, useContext, useState } from "react";

interface TeamFilterContextValue {
  search: string;
  setSearch: (value: string) => void;
  isFocused: boolean;
  setIsFocused: (value: boolean) => void;
  isExpanded: boolean;
}

const TeamFilterContext = createContext<TeamFilterContextValue | null>(null);

// Holds the team-name filter text so the input (in the control row) and the
// game list (below it) can share state without a round trip to the server.
// Remount this provider (e.g. via `key={week}`) to reset the filter, since
// there's otherwise no single owner of both pieces to clear it from.
export function TeamFilterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const isExpanded = isFocused || search !== "";
  return (
    <TeamFilterContext.Provider
      value={{ search, setSearch, isFocused, setIsFocused, isExpanded }}
    >
      {children}
    </TeamFilterContext.Provider>
  );
}

export function useTeamFilter(): TeamFilterContextValue {
  const context = useContext(TeamFilterContext);
  if (!context) {
    throw new Error("useTeamFilter must be used within a TeamFilterProvider");
  }
  return context;
}

export function TeamFilterInput() {
  const { search, setSearch, setIsFocused } = useTeamFilter();

  return (
    <div className="relative flex-1">
      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onFocus={(event) => {
          event.target.select();
          setIsFocused(true);
        }}
        onBlur={() => setIsFocused(false)}
        placeholder="Filter by team..."
        aria-label="Filter by team name"
        className="w-full rounded-md border border-black/8 hover:border-gray-400 bg-transparent px-3 py-1.5 pr-8 text-sm dark:border-white/25 dark:hover:border-white/50"
      />
      {search && (
        <button
          type="button"
          onClick={() => setSearch("")}
          aria-label="Clear team filter"
          className="absolute inset-y-0 right-2 flex items-center text-zinc-500 hover:text-foreground text-xs font-mono"
        >
          × CLEAR
        </button>
      )}
    </div>
  );
}

// Wraps the other control-row filters so they collapse out of the way while
// the team filter is focused or has text, letting TeamFilterInput's flex-1
// take over the row.
export function HideWhenTeamFilterExpanded({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded } = useTeamFilter();
  return (
    <div className={`flex items-center gap-2 ${isExpanded ? "hidden" : ""}`}>
      {children}
    </div>
  );
}
