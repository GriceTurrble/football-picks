// The app's only persisted state: the picks the user has made. Everything
// else - games, bye weeks, odds - is fetched live from ESPN and kept in
// memory for the session (see lib/season-cache.ts), so it never needs to
// survive a reload.
//
// localStorage is synchronous, which means this store is ready on the first
// client render: no await and no loading state. The server (and the hydration
// render) sees an empty snapshot, which React replaces as soon as the client
// subscribes - see lib/use-pick-store.ts.
import type { PickEntry } from "@/lib/types";

const STORAGE_KEY = "football-picks:picks:v1";

interface PickState {
  /** False on the server, true in the browser. */
  ready: boolean;
  picks: Record<string, PickEntry>;
}

/** What components see: one object whose identity changes on every change. */
export type PickSnapshot = Readonly<PickState>;

const SERVER_SNAPSHOT: PickSnapshot = Object.freeze({
  ready: false,
  picks: {},
});

function isPickEntry(value: unknown): value is PickEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Partial<PickEntry>;
  return (
    typeof entry.gameId === "string" &&
    typeof entry.season === "number" &&
    (entry.team === undefined ||
      entry.team === "home" ||
      entry.team === "away") &&
    (entry.teamName === undefined || typeof entry.teamName === "string") &&
    (entry.scoreTotal === undefined || typeof entry.scoreTotal === "number") &&
    typeof entry.updatedAt === "string"
  );
}

// Validates row by row rather than all-or-nothing: one malformed entry (say,
// from a hand-edited or older payload) shouldn't throw away every pick.
function readStoredPicks(): Record<string, PickEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {};
    }

    const picks: Record<string, PickEntry> = {};
    for (const [gameId, entry] of Object.entries(parsed)) {
      if (isPickEntry(entry)) picks[gameId] = entry;
    }
    return picks;
  } catch (error) {
    console.error("[pick-store] failed to read picks:", error);
    return {};
  }
}

const isBrowser = typeof window !== "undefined";

let state: PickState = {
  ready: isBrowser,
  picks: isBrowser ? readStoredPicks() : {},
};
let snapshot: PickSnapshot = state;

const listeners = new Set<() => void>();
let watchingStorage = false;

function publish(): void {
  snapshot = state;
  for (const listener of listeners) listener();
}

// Another tab wrote to localStorage; this one picks up the change. The
// browser only fires this in *other* tabs, so there's no echo to guard
// against.
function handleStorage(event: StorageEvent): void {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  state = { ready: true, picks: readStoredPicks() };
  publish();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!watchingStorage && typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
    watchingStorage = true;
  }
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): PickSnapshot {
  return snapshot;
}

export function getServerSnapshot(): PickSnapshot {
  return SERVER_SNAPSHOT;
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.picks));
  } catch (error) {
    // Private browsing and a full quota both land here. Keep the change in
    // memory so the page works, but it won't survive a reload.
    console.error("[pick-store] failed to save picks:", error);
  }
}

/** Inserts or replaces one game's pick row. */
export function writePick(pick: PickEntry): void {
  state = { ...state, picks: { ...state.picks, [pick.gameId]: pick } };
  publish();
  persist();
}

/** Removes one game's pick row once it holds neither a pick nor a score total. */
export function deletePick(gameId: string): void {
  if (!(gameId in state.picks)) return;

  const picks = { ...state.picks };
  delete picks[gameId];
  state = { ...state, picks };
  publish();
  persist();
}

// Field-wise, so an imported row that only carries a score total doesn't
// erase the winner already stored for that game (and vice versa). A new
// winner takes its team name with it - keeping the old name would label the
// pick with the wrong team.
function mergePick(
  existing: PickEntry | undefined,
  incoming: PickEntry,
): PickEntry {
  if (!existing) return incoming;

  const merged: PickEntry = {
    ...existing,
    season: incoming.season,
    updatedAt: incoming.updatedAt,
  };
  if (incoming.team !== undefined) {
    merged.team = incoming.team;
    merged.teamName = incoming.teamName;
  } else if (incoming.teamName !== undefined) {
    merged.teamName = incoming.teamName;
  }
  if (incoming.scoreTotal !== undefined) {
    merged.scoreTotal = incoming.scoreTotal;
  }
  return merged;
}

/**
 * Inserts or updates many rows at once. Everything lands in a single state
 * update and a single localStorage write, so a large import doesn't publish
 * (or fire another tab's `storage` event) once per row.
 */
export function writePicks(entries: PickEntry[]): void {
  if (entries.length === 0) return;

  const picks = { ...state.picks };
  for (const entry of entries) {
    picks[entry.gameId] = mergePick(picks[entry.gameId], entry);
  }
  state = { ...state, picks };
  publish();
  persist();
}

/**
 * Removes many rows at once - one state update and one write, like
 * writePicks. Returns how many rows actually existed (and were deleted).
 */
export function deletePicks(gameIds: Iterable<string>): number {
  const picks = { ...state.picks };
  let removed = 0;
  for (const gameId of gameIds) {
    if (!(gameId in picks)) continue;
    delete picks[gameId];
    removed += 1;
  }
  if (removed === 0) return 0;

  state = { ...state, picks };
  publish();
  persist();
  return removed;
}
