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
