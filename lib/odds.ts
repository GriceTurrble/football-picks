import { getDb } from "@/lib/db";
import type { Odds, OddsSideDetail, OddsTotalDetail } from "@/lib/types";

interface OddsRow {
  game_id: string;
  provider_name: string;
  provider_priority: number | null;
  details: string | null;
  spread: number | null;
  over_under: number | null;
  over_odds: number | null;
  under_odds: number | null;
  moneyline_winner: number | null;
  spread_winner: number | null;
  home_moneyline: number | null;
  home_spread_odds: number | null;
  home_favorite: number | null;
  home_detail: string;
  away_moneyline: number | null;
  away_spread_odds: number | null;
  away_favorite: number | null;
  away_detail: string;
  total_detail: string;
  fetched_at: string;
}

function toBool(value: number | null): boolean | null {
  return value === null ? null : Boolean(value);
}

function rowToOdds(row: OddsRow): Odds {
  return {
    gameId: row.game_id,
    providerName: row.provider_name,
    providerPriority: row.provider_priority,
    details: row.details,
    spread: row.spread,
    overUnder: row.over_under,
    overOdds: row.over_odds,
    underOdds: row.under_odds,
    moneylineWinner: toBool(row.moneyline_winner),
    spreadWinner: toBool(row.spread_winner),
    home: {
      moneyLine: row.home_moneyline,
      spreadOdds: row.home_spread_odds,
      favorite: toBool(row.home_favorite),
      detail: JSON.parse(row.home_detail) as OddsSideDetail,
    },
    away: {
      moneyLine: row.away_moneyline,
      spreadOdds: row.away_spread_odds,
      favorite: toBool(row.away_favorite),
      detail: JSON.parse(row.away_detail) as OddsSideDetail,
    },
    total: JSON.parse(row.total_detail) as OddsTotalDetail,
    fetchedAt: row.fetched_at,
  };
}

/** A single game's odds, or null if none have been fetched yet. */
export function getOdds(gameId: string): Odds | null {
  const row = getDb()
    .prepare("SELECT * FROM odds WHERE game_id = ?")
    .get(gameId) as OddsRow | undefined;
  return row ? rowToOdds(row) : null;
}

/** Odds for a set of games, keyed by game id. Games with none fetched yet are omitted. */
export function listOdds(gameIds: string[]): Record<string, Odds> {
  if (gameIds.length === 0) return {};

  const placeholders = gameIds.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(`SELECT * FROM odds WHERE game_id IN (${placeholders})`)
    .all(...gameIds) as unknown as OddsRow[];

  return Object.fromEntries(rows.map((row) => [row.game_id, rowToOdds(row)]));
}
