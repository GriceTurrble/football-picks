import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

// This app only ever runs via `next dev` (or a one-off `node` script) on a
// single machine, so a module-level singleton backed by a file on disk is
// all the persistence we need — no server, no migrations tooling.
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
  `);

  return db;
}
