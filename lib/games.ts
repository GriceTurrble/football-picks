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
  home_team_id: string;
  home_team_name: string;
  home_score: number | null;
  away_team_id: string;
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
    homeTeamId: row.home_team_id,
    homeTeamName: row.home_team_name,
    homeScore: row.home_score,
    awayTeamId: row.away_team_id,
    awayTeamName: row.away_team_name,
    awayScore: row.away_score,
  };
}

// `games` only stores each side's team id - display names live in `teams` -
// so every read here joins that table in twice (once per side) to get the
// name back for free.
const GAME_COLUMNS = `
  games.id, games.season, games.week, games.kickoff, games.status,
  games.status_detail, games.venue,
  games.home_team_id, home.name AS home_team_name, games.home_score,
  games.away_team_id, away.name AS away_team_name, games.away_score
`;
const GAME_JOIN = `
  FROM games
  JOIN teams AS home ON home.id = games.home_team_id
  JOIN teams AS away ON away.id = games.away_team_id
`;

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
    .prepare(
      "SELECT DISTINCT week FROM games WHERE season = ? ORDER BY week ASC",
    )
    .all(season) as { week: number }[];
  return rows.map((r) => r.week);
}

/** Games for a season, optionally narrowed to a single week. */
export function listGames(season: number, week?: number): Game[] {
  const db = getDb();
  const rows = (week === undefined
    ? db
        .prepare(
          `SELECT ${GAME_COLUMNS} ${GAME_JOIN}
             WHERE games.season = ?
             ORDER BY games.week ASC, games.kickoff ASC`,
        )
        .all(season)
    : db
        .prepare(
          `SELECT ${GAME_COLUMNS} ${GAME_JOIN}
             WHERE games.season = ? AND games.week = ?
             ORDER BY games.kickoff ASC`,
        )
        .all(season, week)) as unknown as GameRow[];
  return rows.map(rowToGame);
}

/** A single game by its id, or null if it doesn't exist. */
export function getGame(id: string): Game | null {
  const row = getDb()
    .prepare(`SELECT ${GAME_COLUMNS} ${GAME_JOIN} WHERE games.id = ?`)
    .get(id) as GameRow | undefined;
  return row ? rowToGame(row) : null;
}
