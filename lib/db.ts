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
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      season INTEGER NOT NULL,
      week INTEGER NOT NULL,
      kickoff TEXT NOT NULL,
      status TEXT NOT NULL,
      status_detail TEXT,
      venue TEXT,
      home_team_abbr TEXT NOT NULL,
      home_team_name TEXT NOT NULL,
      home_score INTEGER,
      away_team_abbr TEXT NOT NULL,
      away_team_name TEXT NOT NULL,
      away_score INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_games_season_week ON games (season, week);

    CREATE TABLE IF NOT EXISTS picks (
      game_id TEXT PRIMARY KEY REFERENCES games (id),
      team TEXT NOT NULL CHECK (team IN ('home', 'away')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}
