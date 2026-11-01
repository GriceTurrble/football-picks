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

/**
 * Which slice of a season to load:
 *  - a number: that regular-season week
 *  - "current": whichever week ESPN says is happening now (one request)
 *  - "all": the whole regular season (two requests; every week view after
 *    that is a cache hit)
 */
export type SeasonScope = number | "current" | "all";

const SESSION_PREFIX = "football-picks:season:v2:";

// Matches the refresh cadence: inside this window a cached schedule is served
// as-is, so switching weeks and navigating doesn't refetch; past it, the next
// load re-checks ESPN. Manual/automatic refresh bypasses it entirely.
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  data: SeasonData;
  fetchedAt: number;
}

/** What a subscriber sees for one season (or one slice of it). */
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

function cacheKey(season: number, scope: SeasonScope): string {
  if (scope === "all") return `${season}`;
  if (scope === "current") return `${season}:current`;
  return `${season}:w${scope}`;
}

function weekKeys(season: number): string[] {
  const keys: string[] = [];
  for (let week = 1; week <= REGULAR_SEASON_WEEKS; week++) {
    keys.push(cacheKey(season, week));
  }
  return keys;
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
    Array.isArray(entry.data.byes) &&
    (entry.data.week === null || typeof entry.data.week === "number")
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

/** A whole-season entry can answer for any week it contains. */
function coversWeek(data: SeasonData, week: number): boolean {
  return (
    data.week === null &&
    (data.games.some((game) => game.week === week) ||
      data.byes.some((bye) => bye.week === week))
  );
}

function sliceWeek(data: SeasonData, week: number): SeasonData {
  return {
    games: data.games.filter((game) => game.week === week),
    byes: data.byes.filter((bye) => bye.week === week),
    week,
  };
}

// A week view is served from the whole-season entry when there is one, so a
// season-wide load makes every week instant; a "current" fetch answers for
// the week it resolved to as well.
function peekEntry(season: number, scope: SeasonScope): CacheEntry | null {
  if (typeof scope === "number") {
    const full = getEntry(cacheKey(season, "all"));
    if (full && coversWeek(full.data, scope)) {
      return { data: sliceWeek(full.data, scope), fetchedAt: full.fetchedAt };
    }

    const current = getEntry(cacheKey(season, "current"));
    if (current && current.data.week === scope) return current;
  }
  return getEntry(cacheKey(season, scope));
}

function freshEntry(season: number, scope: SeasonScope): CacheEntry | null {
  const entry = peekEntry(season, scope);
  return entry && isFresh(entry) ? entry : null;
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
  scope: SeasonScope,
  status: SeasonStatus,
): void {
  statuses.set(cacheKey(season, scope), status);
  emit();
}

// Writing a whole season makes every per-week status derived from the old
// copy invalid; the next read re-derives them from the new entry.
function invalidateStatus(season: number, scope: SeasonScope): void {
  statuses.delete(cacheKey(season, scope));
  if (scope === "all") {
    for (const key of weekKeys(season)) statuses.delete(key);
    statuses.delete(cacheKey(season, "current"));
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
 * The current status for one season (or slice), without fetching. Stable
 * between changes - a cached week view is derived once and reused - which is
 * what useSyncExternalStore requires.
 */
export function getSeasonStatus(
  season: number,
  scope: SeasonScope,
): SeasonStatus {
  const key = cacheKey(season, scope);
  const existing = statuses.get(key);
  if (existing) return existing;

  const cached = peekEntry(season, scope);
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
export function peekSeason(
  season: number,
  scope: SeasonScope,
): SeasonData | null {
  return peekEntry(season, scope)?.data ?? null;
}

function fetchFor(season: number, scope: SeasonScope): Promise<SeasonData> {
  if (scope === "all") return fetchSeason(season);
  if (scope === "current") return fetchWeek(season);
  return fetchWeek(season, scope);
}

function run(
  season: number,
  scope: SeasonScope,
  force: boolean,
): Promise<void> {
  if (!force) {
    const cached = freshEntry(season, scope);
    if (cached) {
      setStatus(season, scope, {
        data: cached.data,
        error: null,
        fetchedAt: cached.fetchedAt,
      });
      return Promise.resolve();
    }
  }

  const key = cacheKey(season, scope);
  const pending = inFlight.get(key);
  if (pending) return pending;

  // Keep whatever is already showing while re-fetching; just clear the error.
  const previous = getSeasonStatus(season, scope);
  setStatus(season, scope, {
    data: previous.data,
    error: null,
    fetchedAt: previous.fetchedAt,
  });

  const request = fetchFor(season, scope)
    .then((data) => {
      const fetchedAt = Date.now();
      const entry = { data, fetchedAt };
      storeEntry(key, entry);

      // A "current" fetch also answers for the week it resolved to.
      if (scope === "current" && data.week !== null) {
        storeEntry(cacheKey(season, data.week), entry);
        invalidateStatus(season, data.week);
      }

      invalidateStatus(season, scope);
      setStatus(season, scope, { data, error: null, fetchedAt });
    })
    .catch((reason: unknown) => {
      setStatus(season, scope, {
        ...getSeasonStatus(season, scope),
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
 * Concurrent callers for the same season/scope share one request.
 */
export function loadSeason(season: number, scope: SeasonScope): Promise<void> {
  return run(season, scope, false);
}

/**
 * Bypasses the cache and re-fetches from ESPN.
 *
 * Refreshing a whole season drops that season's per-week entries too, so a
 * later week view can't be served data from before the refresh. Refreshing
 * one week drops the whole-season entry (which now holds an older copy) as
 * well as the "current" entry when it points at the same week.
 */
export function refreshSeason(
  season: number,
  scope: SeasonScope,
): Promise<void> {
  const keys = new Set<string>([
    cacheKey(season, scope),
    cacheKey(season, "all"),
    cacheKey(season, "current"),
  ]);
  if (scope === "all") {
    for (const key of weekKeys(season)) keys.add(key);
  } else {
    const currentWeek = getEntry(cacheKey(season, "current"))?.data.week;
    if (currentWeek !== null && currentWeek !== undefined) {
      keys.add(cacheKey(season, currentWeek));
    }
  }

  for (const key of keys) dropEntry(key);
  return run(season, scope, true);
}
