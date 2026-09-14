import { getDb } from "@/lib/db";
import type { PickSelection } from "@/lib/types";

interface PickRow {
  game_id: string;
  team: PickSelection;
}

interface ScoreTotalRow {
  game_id: string;
  score_total: number;
}

/** Picks for a set of games, keyed by game id. Games with no pick are omitted. */
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

/**
 * Score-total tiebreaker entries for a set of games, keyed by game id.
 * Games with no entry are omitted.
 */
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

/** Sets (or replaces) the pick for a game, leaving any score-total entry as-is. */
export function setPick(gameId: string, team: PickSelection): void {
  getDb()
    .prepare(
      `INSERT INTO picks (game_id, team) VALUES (?, ?)
       ON CONFLICT (game_id) DO UPDATE SET team = excluded.team, updated_at = datetime('now')`,
    )
    .run(gameId, team);
}

/**
 * Removes the pick for a game, if one exists. Leaves a score-total entry in
 * place; only drops the row entirely once neither field has anything left.
 */
export function clearPick(gameId: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE picks SET team = NULL, updated_at = datetime('now') WHERE game_id = ?",
  ).run(gameId);
  pruneEmptyRow(db, gameId);
}

/** Sets (or replaces) the score-total entry for a game, leaving any pick as-is. */
export function setScoreTotal(gameId: string, total: number): void {
  getDb()
    .prepare(
      `INSERT INTO picks (game_id, score_total) VALUES (?, ?)
       ON CONFLICT (game_id) DO UPDATE SET score_total = excluded.score_total, updated_at = datetime('now')`,
    )
    .run(gameId, total);
}

/**
 * Removes the score-total entry for a game, if one exists. Leaves a pick in
 * place; only drops the row entirely once neither field has anything left.
 */
export function clearScoreTotal(gameId: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE picks SET score_total = NULL, updated_at = datetime('now') WHERE game_id = ?",
  ).run(gameId);
  pruneEmptyRow(db, gameId);
}

// A picks row exists purely so *something* - a pick, a score total, or both
// - has somewhere to live. Once a clear leaves both NULL, there's nothing
// left to keep the row around for.
function pruneEmptyRow(db: ReturnType<typeof getDb>, gameId: string): void {
  db.prepare(
    "DELETE FROM picks WHERE game_id = ? AND team IS NULL AND score_total IS NULL",
  ).run(gameId);
}
