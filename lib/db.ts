import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "football-picks.db");

let db: DatabaseSync | undefined;

export function getDb(): DatabaseSync {
  if (db) return db;

  mkdirSync(DB_DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      season INTEGER NOT NULL,
      week INTEGER NOT NULL,
      kickoff TEXT NOT NULL,
      status TEXT NOT NULL,
      status_detail TEXT,
      venue TEXT,
      home_team_id TEXT NOT NULL REFERENCES teams (id),
      home_score INTEGER,
      away_team_id TEXT NOT NULL REFERENCES teams (id),
      away_score INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_games_season_week ON games (season, week);

    CREATE TABLE IF NOT EXISTS bye_weeks (
      season INTEGER NOT NULL,
      week INTEGER NOT NULL,
      team_id TEXT NOT NULL REFERENCES teams (id),
      PRIMARY KEY (season, week, team_id)
    );

    -- team is nullable: a row can hold a score-total tiebreaker entry (see
    -- migratePicksTable below) with no winner pick yet, or vice versa.
    CREATE TABLE IF NOT EXISTS picks (
      game_id TEXT PRIMARY KEY REFERENCES games (id),
      team TEXT CHECK (team IN ('home', 'away')),
      score_total INTEGER,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- When lib/game-refresh.ts last actually finished checking a season
    -- against ESPN (not merely when a client happened to notice) - see
    -- lib/sync-status.ts.
    CREATE TABLE IF NOT EXISTS season_sync (
      season INTEGER PRIMARY KEY,
      synced_at TEXT NOT NULL
    );
  `);

  migratePicksTable(db);

  return db;
}

// `picks` originally had `team TEXT NOT NULL` and no `score_total` column.
// `CREATE TABLE IF NOT EXISTS` above no-ops against an existing table, so a
// database created before the score-total tiebreaker feature needs its
// `picks` table rebuilt to drop the NOT NULL constraint and add the column.
// No-ops once that's done - the CREATE TABLE above already gets it right
// for a fresh database, so this never has anything to do there.
function migratePicksTable(db: DatabaseSync): void {
  const hasScoreTotal = db
    .prepare(
      "SELECT 1 FROM pragma_table_info('picks') WHERE name = 'score_total'",
    )
    .get();
  if (hasScoreTotal) return;

  db.exec("BEGIN");
  try {
    db.exec(`
      CREATE TABLE picks_new (
        game_id TEXT PRIMARY KEY REFERENCES games (id),
        team TEXT CHECK (team IN ('home', 'away')),
        score_total INTEGER,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      INSERT INTO picks_new (game_id, team, updated_at)
      SELECT game_id, team, updated_at FROM picks;

      DROP TABLE picks;
      ALTER TABLE picks_new RENAME TO picks;
    `);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
