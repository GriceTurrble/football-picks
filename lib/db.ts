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

    CREATE TABLE IF NOT EXISTS picks (
      game_id TEXT PRIMARY KEY REFERENCES games (id),
      team TEXT NOT NULL CHECK (team IN ('home', 'away')),
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

  return db;
}
