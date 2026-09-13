"use client";

import { createContext, useContext, useState } from "react";

interface TeamFilterContextValue {
  search: string;
  setSearch: (value: string) => void;
}

const TeamFilterContext = createContext<TeamFilterContextValue | null>(null);

// Holds the team-name filter text so the input (in the control row) and the
// game list (below it) can share state without a round trip to the server.
// Remount this provider (e.g. via `key={week}`) to reset the filter, since
// there's otherwise no single owner of both pieces to clear it from.
export function TeamFilterProvider({ children }: { children: React.ReactNode }) {
  const [search, setSearch] = useState("");
  return (
    <TeamFilterContext.Provider value={{ search, setSearch }}>
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
  const { search, setSearch } = useTeamFilter();

  return (
    <div className="relative flex-1">
      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onFocus={(event) => event.target.select()}
        placeholder="Filter by team…"
        aria-label="Filter by team name"
        className="w-full rounded-md border border-black/8 bg-transparent px-3 py-1.5 pr-8 text-sm dark:border-white/[.145]"
      />
      {search && (
        <button
          type="button"
          onClick={() => setSearch("")}
          aria-label="Clear team filter"
          className="absolute inset-y-0 right-2 flex items-center text-zinc-500 hover:text-foreground"
        >
          ×
        </button>
      )}
    </div>
  );
}
