import { getDb } from "@/lib/db";
import type { PickSelection } from "@/lib/types";

interface PickRow {
  game_id: string;
  team: PickSelection;
}

/** Picks for a set of games, keyed by game id. Games with no pick are omitted. */
export function listPicks(gameIds: string[]): Record<string, PickSelection> {
  if (gameIds.length === 0) return {};

  const placeholders = gameIds.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(
      `SELECT game_id, team FROM picks WHERE game_id IN (${placeholders})`,
    )
    .all(...gameIds) as unknown as PickRow[];

  return Object.fromEntries(rows.map((row) => [row.game_id, row.team]));
}

/** Sets (or replaces) the pick for a game. A game can only have one pick. */
export function setPick(gameId: string, team: PickSelection): void {
  getDb()
    .prepare(
      `INSERT INTO picks (game_id, team) VALUES (?, ?)
       ON CONFLICT (game_id) DO UPDATE SET team = excluded.team, updated_at = datetime('now')`,
    )
    .run(gameId, team);
}

/** Removes the pick for a game, if one exists. */
export function clearPick(gameId: string): void {
  getDb().prepare("DELETE FROM picks WHERE game_id = ?").run(gameId);
}
