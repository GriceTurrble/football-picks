// Live betting odds for a single game, fetched from ESPN's public (unofficial,
// unauthenticated) core sports API on demand.
//
// Odds are the most expensive thing to fetch (one request per game, ~13 KB
// each), so unlike the schedule they aren't pulled all at once: a game asks
// for its own odds when it renders, requests go through a small concurrency
// queue, and the result is kept in memory for the rest of the session. That's
// enough for inline spreads to fill in progressively and for the odds modal to
// open instantly afterwards.
//
// Nothing here is persisted. A reload refetches (the schedule comes back from
// sessionStorage, but new odds are worth having anyway).
import type {
  Odds,
  OddsSideDetail,
  OddsSideSnapshot,
  OddsTotalDetail,
  OddsTotalSnapshot,
} from "@/lib/types";

// The event id and competition id in this URL are always the same value -
// ESPN's NFL competitions map one-to-one with their events - and that value
// is the same id the schedule uses (lib/espn.ts).
const oddsUrl = (gameId: string) =>
  `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/${gameId}/competitions/${gameId}/odds`;

// How many odds requests may be in flight at once while filling in a week's
// spreads. Enough to feel quick on a 16-game list, few enough not to look
// like an attack on ESPN.
const MAX_CONCURRENT = 4;

interface EspnOddsTeamOdds {
  favorite?: boolean;
  underdog?: boolean;
  moneyLine?: number;
  spreadOdds?: number;
  open?: OddsSideSnapshot;
  current?: OddsSideSnapshot;
  close?: OddsSideSnapshot;
}

interface EspnOddsItem {
  provider: { id: string; name: string; priority: number };
  details?: string;
  overUnder?: number;
  spread?: number;
  overOdds?: number;
  underOdds?: number;
  moneylineWinner?: boolean;
  spreadWinner?: boolean;
  homeTeamOdds: EspnOddsTeamOdds;
  awayTeamOdds: EspnOddsTeamOdds;
  open?: OddsTotalSnapshot;
  current?: OddsTotalSnapshot;
  close?: OddsTotalSnapshot;
}

interface EspnOddsResponse {
  count: number;
  items?: EspnOddsItem[];
}

function toSideDetail(team: EspnOddsTeamOdds): OddsSideDetail {
  return { open: team.open, current: team.current, close: team.close };
}

function toTotalDetail(item: EspnOddsItem): OddsTotalDetail {
  return { open: item.open, current: item.current, close: item.close };
}

async function fetchOddsItem(gameId: string): Promise<EspnOddsItem | null> {
  const response = await fetch(oddsUrl(gameId));
  // ESPN 404s outright for an id it doesn't recognize, but returns 200 with
  // an empty `items` list for a real competition that simply has no odds
  // posted (too far out, or never covered by a book) - both mean "nothing to
  // show", not an error worth throwing over.
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(
      `ESPN odds request failed for game ${gameId}: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as EspnOddsResponse;
  const items = data.items ?? [];
  if (items.length === 0) return null;

  // Always one item in practice (ESPN's free tier surfaces a single "best"
  // book per game), but sort by priority just in case more than one shows
  // up - lower priority number wins, matching how ESPN itself orders them.
  return [...items].sort(
    (a, b) => a.provider.priority - b.provider.priority,
  )[0];
}

function toOdds(gameId: string, item: EspnOddsItem, fetchedAt: string): Odds {
  return {
    gameId,
    providerName: item.provider.name,
    providerPriority: item.provider.priority ?? null,
    details: item.details ?? null,
    spread: item.spread ?? null,
    overUnder: item.overUnder ?? null,
    overOdds: item.overOdds ?? null,
    underOdds: item.underOdds ?? null,
    moneylineWinner: item.moneylineWinner ?? null,
    spreadWinner: item.spreadWinner ?? null,
    home: {
      moneyLine: item.homeTeamOdds.moneyLine ?? null,
      spreadOdds: item.homeTeamOdds.spreadOdds ?? null,
      favorite: item.homeTeamOdds.favorite ?? null,
      detail: toSideDetail(item.homeTeamOdds),
    },
    away: {
      moneyLine: item.awayTeamOdds.moneyLine ?? null,
      spreadOdds: item.awayTeamOdds.spreadOdds ?? null,
      favorite: item.awayTeamOdds.favorite ?? null,
      detail: toSideDetail(item.awayTeamOdds),
    },
    total: toTotalDetail(item),
    fetchedAt,
  };
}

// gameId -> odds, or null for "ESPN has none for this game". The null entry
// matters: it stops a game with no posted line from being re-requested on
// every render. A failed request is *not* cached, so a later attempt retries.
const cache = new Map<string, Odds | null>();
const inFlight = new Map<string, Promise<Odds | null>>();
const listeners = new Set<() => void>();

// Requests waiting for a free slot, plus membership so the same game can't be
// queued twice.
const queue: string[] = [];
const queued = new Set<string>();
let active = 0;

function emit(): void {
  for (const listener of listeners) listener();
}

/** Subscribes to odds changes; used by useSyncExternalStore. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** This game's cached odds, or null until they've been fetched (or if none exist). */
export function getOdds(gameId: string): Odds | null {
  return cache.get(gameId) ?? null;
}

/** True while this game's odds are queued or in flight. */
export function isFetchingOdds(gameId: string): boolean {
  return inFlight.has(gameId) || queued.has(gameId);
}

function load(gameId: string): Promise<Odds | null> {
  const pending = inFlight.get(gameId);
  if (pending) return pending;

  const request = fetchOddsItem(gameId)
    .then((item) => {
      const odds = item ? toOdds(gameId, item, new Date().toISOString()) : null;
      cache.set(gameId, odds);
      return odds;
    })
    .catch((reason: unknown) => {
      // Inline spreads just stay blank for this game; the odds modal's
      // Refresh button is the retry path.
      console.warn(`[odds] failed to fetch odds for ${gameId}:`, reason);
      return null;
    })
    .finally(() => {
      inFlight.delete(gameId);
      emit();
    });

  inFlight.set(gameId, request);
  emit();
  return request;
}

function pump(): void {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    const gameId = queue.shift()!;
    queued.delete(gameId);
    // Fetched while it sat in the queue - nothing left to do.
    if (cache.has(gameId)) continue;

    active += 1;
    void load(gameId).finally(() => {
      active -= 1;
      pump();
    });
  }
}

/**
 * Queues a fetch for any of `gameIds` that hasn't been fetched yet. Safe to
 * call on every render: games that are cached, queued, or in flight are
 * skipped, and the queue caps how many requests run at once.
 */
export function ensureOdds(gameIds: string[]): void {
  let added = false;
  for (const gameId of gameIds) {
    if (cache.has(gameId) || queued.has(gameId) || inFlight.has(gameId)) {
      continue;
    }
    queue.push(gameId);
    queued.add(gameId);
    added = true;
  }

  if (!added) return;
  emit();
  pump();
}

/**
 * Bypasses the cache and re-fetches one game's odds - the odds modal's
 * Refresh button. Named singular because it's a single deliberate request
 * rather than part of filling in a whole week.
 */
export function refreshOdds(gameId: string): Promise<Odds | null> {
  cache.delete(gameId);
  emit();
  return load(gameId);
}

/**
 * Re-fetches odds for a set of games through the normal concurrency queue -
 * used by the page's periodic refresh for games in the sync window. Games
 * already in flight are left alone; everything else is dropped from the
 * cache and queued again.
 */
export function refreshOddsFor(gameIds: string[]): void {
  const stale: string[] = [];
  for (const gameId of gameIds) {
    cache.delete(gameId);
    if (!inFlight.has(gameId)) stale.push(gameId);
  }
  if (stale.length === 0) return;
  emit();
  ensureOdds(stale);
}
