// Temporary bridge: the SQLite-backed queries the app still runs on while the
// client-only rewrite lands (app/page.tsx, lib/pick-actions.ts,
// lib/game-refresh.ts, lib/odds-sync.ts). These are the old contents of
// lib/games.ts, lib/bye-weeks.ts, lib/picks.ts, and lib/odds.ts, which now
// hold the live/ESPN versions instead.
//
// This whole file goes away with the rest of the database once the page and
// its actions are client components.
import { getDb } from "@/lib/db";
import type {
  ByeWeek,
  Game,
  GameStatus,
  Odds,
  OddsSideDetail,
  OddsTotalDetail,
  PickSelection,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// games
// ---------------------------------------------------------------------------

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

export function listSeasons(): number[] {
  const rows = getDb()
    .prepare("SELECT DISTINCT season FROM games ORDER BY season DESC")
    .all() as { season: number }[];
  return rows.map((r) => r.season);
}

export function listWeeks(season: number): number[] {
  const rows = getDb()
    .prepare(
      "SELECT DISTINCT week FROM games WHERE season = ? ORDER BY week ASC",
    )
    .all(season) as { week: number }[];
  return rows.map((r) => r.week);
}

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

export function getGame(id: string): Game | null {
  const row = getDb()
    .prepare(`SELECT ${GAME_COLUMNS} ${GAME_JOIN} WHERE games.id = ?`)
    .get(id) as GameRow | undefined;
  return row ? rowToGame(row) : null;
}

// ---------------------------------------------------------------------------
// bye weeks
// ---------------------------------------------------------------------------

interface ByeWeekRow {
  season: number;
  week: number;
  team_id: string;
  team_name: string;
}

function rowToByeWeek(row: ByeWeekRow): ByeWeek {
  return {
    season: row.season,
    week: row.week,
    teamId: row.team_id,
    teamName: row.team_name,
  };
}

export function listByeWeeks(season: number, week?: number): ByeWeek[] {
  const db = getDb();
  const rows = (week === undefined
    ? db
        .prepare(
          `SELECT bye_weeks.season, bye_weeks.week, bye_weeks.team_id, teams.name AS team_name
             FROM bye_weeks
             JOIN teams ON teams.id = bye_weeks.team_id
             WHERE bye_weeks.season = ?
             ORDER BY bye_weeks.week ASC, teams.name ASC`,
        )
        .all(season)
    : db
        .prepare(
          `SELECT bye_weeks.season, bye_weeks.week, bye_weeks.team_id, teams.name AS team_name
             FROM bye_weeks
             JOIN teams ON teams.id = bye_weeks.team_id
             WHERE bye_weeks.season = ? AND bye_weeks.week = ?
             ORDER BY teams.name ASC`,
        )
        .all(season, week)) as unknown as ByeWeekRow[];
  return rows.map(rowToByeWeek);
}

// ---------------------------------------------------------------------------
// picks
// ---------------------------------------------------------------------------

interface PickRow {
  game_id: string;
  team: PickSelection;
}

interface ScoreTotalRow {
  game_id: string;
  score_total: number;
}

export function listPicks(gameIds: string[]): Record<string, PickSelection> {
  if (gameIds.length === 0) return {};

  const placeholders = gameIds.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(
      `SELECT game_id, team FROM picks WHERE game_id IN (${placeholders}) AND team IS NOT NULL`,
    )
    .all(...gameIds) as unknown as PickRow[];

  return Object.fromEntries(rows.map((row) => [row.game_id, row.team]));
}

export function listScoreTotals(gameIds: string[]): Record<string, number> {
  if (gameIds.length === 0) return {};

  const placeholders = gameIds.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(
      `SELECT game_id, score_total FROM picks WHERE game_id IN (${placeholders}) AND score_total IS NOT NULL`,
    )
    .all(...gameIds) as unknown as ScoreTotalRow[];

  return Object.fromEntries(rows.map((row) => [row.game_id, row.score_total]));
}

export function setPick(gameId: string, team: PickSelection): void {
  getDb()
    .prepare(
      `INSERT INTO picks (game_id, team) VALUES (?, ?)
       ON CONFLICT (game_id) DO UPDATE SET team = excluded.team, updated_at = datetime('now')`,
    )
    .run(gameId, team);
}

export function clearPick(gameId: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE picks SET team = NULL, updated_at = datetime('now') WHERE game_id = ?",
  ).run(gameId);
  pruneEmptyRow(db, gameId);
}

export function setScoreTotal(gameId: string, total: number): void {
  getDb()
    .prepare(
      `INSERT INTO picks (game_id, score_total) VALUES (?, ?)
       ON CONFLICT (game_id) DO UPDATE SET score_total = excluded.score_total, updated_at = datetime('now')`,
    )
    .run(gameId, total);
}

export function clearScoreTotal(gameId: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE picks SET score_total = NULL, updated_at = datetime('now') WHERE game_id = ?",
  ).run(gameId);
  pruneEmptyRow(db, gameId);
}

function pruneEmptyRow(db: ReturnType<typeof getDb>, gameId: string): void {
  db.prepare(
    "DELETE FROM picks WHERE game_id = ? AND team IS NULL AND score_total IS NULL",
  ).run(gameId);
}

// ---------------------------------------------------------------------------
// odds
// ---------------------------------------------------------------------------

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

export function getOdds(gameId: string): Odds | null {
  const row = getDb()
    .prepare("SELECT * FROM odds WHERE game_id = ?")
    .get(gameId) as OddsRow | undefined;
  return row ? rowToOdds(row) : null;
}

export function listOdds(gameIds: string[]): Record<string, Odds> {
  if (gameIds.length === 0) return {};

  const placeholders = gameIds.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(`SELECT * FROM odds WHERE game_id IN (${placeholders})`)
    .all(...gameIds) as unknown as OddsRow[];

  return Object.fromEntries(rows.map((row) => [row.game_id, rowToOdds(row)]));
}
