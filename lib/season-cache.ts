// Session cache for ESPN schedule data. Nothing here is persisted: the
// in-memory map covers React re-renders and week switching, and sessionStorage
// keeps the same data across a reload in the same tab. Closing the tab throws
// it away, which is the point - the next visit re-checks ESPN.
//
// Only picks survive a visit (lib/storage/pick-store.ts).
//
// This is an external store: components subscribe (see lib/use-season-data.ts)
// and every load, refresh, or failure publishes a status object they can read.
import type { SeasonData } from "@/lib/types";
import { fetchSeason, fetchWeek, REGULAR_SEASON_WEEKS } from "@/lib/espn";

const SESSION_PREFIX = "football-picks:season:v1:";

// Matches the refresh cadence: inside this window a cached schedule is served
// as-is, so switching weeks and navigating doesn't refetch; past it, the next
// load re-checks ESPN. Manual/automatic refresh bypasses it entirely.
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  data: SeasonData;
  fetchedAt: number;
}

/** What a subscriber sees for one season (or one week of it). */
export interface SeasonStatus {
  /** Null until something has been cached or fetched. */
  data: SeasonData | null;
  error: string | null;
  /** When `data` was fetched from ESPN, for the "refreshed N ago" label. */
  fetchedAt: number | null;
}

const EMPTY_STATUS: SeasonStatus = Object.freeze({
  data: null,
  error: null,
  fetchedAt: null,
});

const memory = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<void>>();
const statuses = new Map<string, SeasonStatus>();
const listeners = new Set<() => void>();

function cacheKey(season: number, week?: number): string {
  return week === undefined ? `${season}` : `${season}:w${week}`;
}

function emit(): void {
  for (const listener of listeners) listener();
}

function isCacheEntry(value: unknown): value is CacheEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Partial<CacheEntry>;
  return (
    typeof entry.fetchedAt === "number" &&
    typeof entry.data === "object" &&
    entry.data !== null &&
    Array.isArray(entry.data.games) &&
    Array.isArray(entry.data.byes)
  );
}

function readSession(key: string): CacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_PREFIX + key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isCacheEntry(parsed)) {
      window.sessionStorage.removeItem(SESSION_PREFIX + key);
      return null;
    }
    return parsed;
  } catch (error) {
    console.error("[season-cache] failed to read session cache:", error);
    return null;
  }
}

function writeSession(key: string, entry: CacheEntry): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_PREFIX + key, JSON.stringify(entry));
  } catch (error) {
    // A full quota just means this tab re-fetches after a reload; the
    // in-memory copy still works.
    console.error("[season-cache] failed to write session cache:", error);
  }
}

function removeSession(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_PREFIX + key);
  } catch (error) {
    console.error("[season-cache] failed to clear session cache:", error);
  }
}

// Memory first, then sessionStorage - a reload hydrates memory from the
// session copy without a request.
function getEntry(key: string): CacheEntry | null {
  const cached = memory.get(key);
  if (cached) return cached;

  const stored = readSession(key);
  if (stored) memory.set(key, stored);
  return stored;
}

function isFresh(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

function getFreshEntry(key: string): CacheEntry | null {
  const entry = getEntry(key);
  return entry && isFresh(entry) ? entry : null;
}

function coversWeek(data: SeasonData, week: number): boolean {
  return data.games.some((game) => game.week === week);
}

function sliceWeek(data: SeasonData, week: number): SeasonData {
  return {
    games: data.games.filter((game) => game.week === week),
    byes: data.byes.filter((bye) => bye.week === week),
  };
}

// A week view is served from the whole-season entry when there is one, so a
// season-wide load makes every week instant.
function peekEntry(season: number, week?: number): CacheEntry | null {
  if (week !== undefined) {
    const full = getEntry(cacheKey(season));
    if (full && coversWeek(full.data, week)) {
      return { data: sliceWeek(full.data, week), fetchedAt: full.fetchedAt };
    }
  }
  return getEntry(cacheKey(season, week));
}

function freshEntry(season: number, week?: number): CacheEntry | null {
  if (week !== undefined) {
    const full = getFreshEntry(cacheKey(season));
    if (full && coversWeek(full.data, week)) {
      return { data: sliceWeek(full.data, week), fetchedAt: full.fetchedAt };
    }
  }
  return getFreshEntry(cacheKey(season, week));
}

function storeEntry(key: string, entry: CacheEntry): void {
  memory.set(key, entry);
  writeSession(key, entry);
}

function dropEntry(key: string): void {
  memory.delete(key);
  removeSession(key);
}

function setStatus(
  season: number,
  week: number | undefined,
  status: SeasonStatus,
): void {
  statuses.set(cacheKey(season, week), status);
  emit();
}

// Writing a whole season makes every per-week status derived from the old
// copy invalid; the next read re-derives them from the new entry.
function invalidateStatus(season: number, week?: number): void {
  statuses.delete(cacheKey(season, week));
  if (week === undefined) {
    for (let w = 1; w <= REGULAR_SEASON_WEEKS; w++) {
      statuses.delete(cacheKey(season, w));
    }
  }
}

/** Subscribes to cache changes; used by useSyncExternalStore. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The current status for one season (or week), without fetching. Stable
 * between changes - a cached week view is derived once and reused - which is
 * what useSyncExternalStore requires.
 */
export function getSeasonStatus(season: number, week?: number): SeasonStatus {
  const key = cacheKey(season, week);
  const existing = statuses.get(key);
  if (existing) return existing;

  const cached = peekEntry(season, week);
  if (!cached) return EMPTY_STATUS;

  const status: SeasonStatus = {
    data: cached.data,
    error: null,
    fetchedAt: cached.fetchedAt,
  };
  statuses.set(key, status);
  return status;
}

/** The server and hydration render: nothing is cached in either. */
export function getServerSeasonStatus(): SeasonStatus {
  return EMPTY_STATUS;
}

/** Cached data, stale or not, without touching the network or React. */
export function peekSeason(season: number, week?: number): SeasonData | null {
  return peekEntry(season, week)?.data ?? null;
}

function run(
  season: number,
  week: number | undefined,
  force: boolean,
): Promise<void> {
  if (!force) {
    const cached = freshEntry(season, week);
    if (cached) {
      setStatus(season, week, {
        data: cached.data,
        error: null,
        fetchedAt: cached.fetchedAt,
      });
      return Promise.resolve();
    }
  }

  const key = cacheKey(season, week);
  const pending = inFlight.get(key);
  if (pending) return pending;

  // Keep whatever is already showing while re-fetching; just clear the error.
  const previous = getSeasonStatus(season, week);
  setStatus(season, week, {
    data: previous.data,
    error: null,
    fetchedAt: previous.fetchedAt,
  });

  const request = (
    week === undefined ? fetchSeason(season) : fetchWeek(season, week)
  )
    .then((data) => {
      const fetchedAt = Date.now();
      storeEntry(key, { data, fetchedAt });
      invalidateStatus(season, week);
      setStatus(season, week, { data, error: null, fetchedAt });
    })
    .catch((reason: unknown) => {
      setStatus(season, week, {
        ...getSeasonStatus(season, week),
        error: reason instanceof Error ? reason.message : String(reason),
      });
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
}

/**
 * Loads a season's schedule into the cache: cached while fresh, a whole-season
 * entry sliced down when only one week was asked for, or a fresh fetch.
 * Concurrent callers for the same season/week share one request.
 */
export function loadSeason(season: number, week?: number): Promise<void> {
  return run(season, week, false);
}

/**
 * Bypasses the cache and re-fetches from ESPN. Refreshing a whole season also
 * drops that season's per-week entries, so a later week view can't be served
 * data from before the refresh.
 */
export function refreshSeason(season: number, week?: number): Promise<void> {
  if (week === undefined) {
    for (let w = 1; w <= REGULAR_SEASON_WEEKS; w++) {
      dropEntry(cacheKey(season, w));
    }
  } else {
    // This week is now newer than the whole-season entry containing it.
    dropEntry(cacheKey(season));
  }
  return run(season, week, true);
}
