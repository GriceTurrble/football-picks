// Pulls betting odds for a single game from ESPN's public (unofficial,
// unauthenticated) core sports API and upserts it into the local database.
// Unlike lib/espn-sync.ts, this isn't run in bulk on a timer - it's fetched
// one competition at a time, on demand, from the odds modal's Refresh button
// (see lib/odds-actions.ts).
import { getDb } from "@/lib/db";
import { getGame } from "@/lib/games";
import type {
  OddsSideDetail,
  OddsSideSnapshot,
  OddsTotalDetail,
  OddsTotalSnapshot,
} from "@/lib/types";

// The event id and competition id in this URL are always the same value -
// ESPN's NFL competitions map one-to-one with their events - and that value
// is the same id already stored as games.id (see lib/espn-sync.ts).
const oddsUrl = (gameId: string) =>
  `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/${gameId}/competitions/${gameId}/odds`;

interface EspnOddsTeamOdds {
  favorite: boolean;
  underdog: boolean;
  moneyLine: number;
  spreadOdds: number;
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
  const res = await fetch(oddsUrl(gameId));
  // ESPN 404s outright for an id it doesn't recognize, but returns 200 with
  // an empty `items` list for a real competition that simply has no odds
  // posted (too far out, or never covered by a book) - both mean "nothing
  // to store", not an error worth throwing over.
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(
      `ESPN odds request failed for game ${gameId}: ${res.status} ${res.statusText}`,
    );
  }
  const data = (await res.json()) as EspnOddsResponse;
  const items = data.items ?? [];
  if (items.length === 0) return null;

  // Always one item in practice (ESPN's free tier surfaces a single "best"
  // book per game), but sort by priority just in case more than one shows
  // up - lower priority number wins, matching how ESPN itself orders them.
  return [...items].sort(
    (a, b) => a.provider.priority - b.provider.priority,
  )[0];
}

const upsertOdds = (gameId: string, item: EspnOddsItem, fetchedAt: string) =>
  getDb()
    .prepare(
      `INSERT INTO odds (
      game_id, provider_name, provider_priority, details, spread, over_under,
      over_odds, under_odds, moneyline_winner, spread_winner,
      home_moneyline, home_spread_odds, home_favorite, home_detail,
      away_moneyline, away_spread_odds, away_favorite, away_detail,
      total_detail, fetched_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(game_id) DO UPDATE SET
      provider_name = excluded.provider_name,
      provider_priority = excluded.provider_priority,
      details = excluded.details,
      spread = excluded.spread,
      over_under = excluded.over_under,
      over_odds = excluded.over_odds,
      under_odds = excluded.under_odds,
      moneyline_winner = excluded.moneyline_winner,
      spread_winner = excluded.spread_winner,
      home_moneyline = excluded.home_moneyline,
      home_spread_odds = excluded.home_spread_odds,
      home_favorite = excluded.home_favorite,
      home_detail = excluded.home_detail,
      away_moneyline = excluded.away_moneyline,
      away_spread_odds = excluded.away_spread_odds,
      away_favorite = excluded.away_favorite,
      away_detail = excluded.away_detail,
      total_detail = excluded.total_detail,
      fetched_at = excluded.fetched_at`,
    )
    .run(
      gameId,
      item.provider.name,
      item.provider.priority ?? null,
      item.details ?? null,
      item.spread ?? null,
      item.overUnder ?? null,
      item.overOdds ?? null,
      item.underOdds ?? null,
      item.moneylineWinner === undefined ? null : Number(item.moneylineWinner),
      item.spreadWinner === undefined ? null : Number(item.spreadWinner),
      item.homeTeamOdds.moneyLine ?? null,
      item.homeTeamOdds.spreadOdds ?? null,
      item.homeTeamOdds.favorite === undefined
        ? null
        : Number(item.homeTeamOdds.favorite),
      JSON.stringify(toSideDetail(item.homeTeamOdds)),
      item.awayTeamOdds.moneyLine ?? null,
      item.awayTeamOdds.spreadOdds ?? null,
      item.awayTeamOdds.favorite === undefined
        ? null
        : Number(item.awayTeamOdds.favorite),
      JSON.stringify(toSideDetail(item.awayTeamOdds)),
      JSON.stringify(toTotalDetail(item)),
      fetchedAt,
    );

// Both the background refresh loop (lib/game-refresh.ts) and the modal's
// manual Refresh button (lib/odds-actions.ts) funnel through syncOdds, so
// logging here - rather than at each call site - is what gets every odds
// fetch logged regardless of who triggered it. Team names come from our own
// DB (already populated by lib/espn-sync.ts) rather than the odds response
// itself, which only references teams by an ESPN resource URL.
function describeGame(gameId: string): string {
  const game = getGame(gameId);
  return game ? `${game.awayTeamName} @ ${game.homeTeamName}` : "unknown teams";
}

/**
 * Fetches odds for a single game from ESPN and upserts it into the local
 * database. Returns true if odds were found and stored, false if ESPN has
 * nothing for this game (yet, or ever) - the modal shows placeholders for
 * whatever's still missing either way.
 */
export async function syncOdds(gameId: string): Promise<boolean> {
  const item = await fetchOddsItem(gameId);
  if (!item) {
    console.log(
      `[odds-sync] no odds available for competition ${gameId} (${describeGame(gameId)})`,
    );
    return false;
  }

  upsertOdds(gameId, item, new Date().toISOString());
  console.log(
    `[odds-sync] synced odds for competition ${gameId} (${describeGame(gameId)})`,
  );
  return true;
}
