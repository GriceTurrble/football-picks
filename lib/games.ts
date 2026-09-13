import { getDb } from "@/lib/db";
import type { Game, GameStatus } from "@/lib/types";

interface GameRow {
  id: string;
  season: number;
  week: number;
  kickoff: string;
  status: string;
  status_detail: string | null;
  venue: string | null;
  home_team_abbr: string;
  home_team_name: string;
  home_score: number | null;
  away_team_abbr: string;
  away_team_name: string;
  away_score: number | null;
}

function rowToGame(row: GameRow): Game {
  return {
    id: row.id,
    season: row.season,
    week: row.week,
    kickoff: row.kickoff,
    status: row.status as GameStatus,
    statusDetail: row.status_detail,
    venue: row.venue,
    homeTeamAbbr: row.home_team_abbr,
    homeTeamName: row.home_team_name,
    homeScore: row.home_score,
    awayTeamAbbr: row.away_team_abbr,
    awayTeamName: row.away_team_name,
    awayScore: row.away_score,
  };
}

/** Seasons present in the database, most recent first. */
export function listSeasons(): number[] {
  const rows = getDb()
    .prepare("SELECT DISTINCT season FROM games ORDER BY season DESC")
    .all() as { season: number }[];
  return rows.map((r) => r.season);
}

/** Week numbers present for a season, in order. */
export function listWeeks(season: number): number[] {
  const rows = getDb()
    .prepare("SELECT DISTINCT week FROM games WHERE season = ? ORDER BY week ASC")
    .all(season) as { week: number }[];
  return rows.map((r) => r.week);
}

/** Games for a season, optionally narrowed to a single week. */
export function listGames(season: number, week?: number): Game[] {
  const db = getDb();
  const rows = (
    week === undefined
      ? db
          .prepare("SELECT * FROM games WHERE season = ? ORDER BY week ASC, kickoff ASC")
          .all(season)
      : db
          .prepare(
            "SELECT * FROM games WHERE season = ? AND week = ? ORDER BY kickoff ASC"
          )
          .all(season, week)
  ) as unknown as GameRow[];
  return rows.map(rowToGame);
}

/** A single game by its id, or null if it doesn't exist. */
export function getGame(id: string): Game | null {
  const row = getDb().prepare("SELECT * FROM games WHERE id = ?").get(id) as
    | GameRow
    | undefined;
  return row ? rowToGame(row) : null;
}
