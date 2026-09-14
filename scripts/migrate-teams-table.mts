// One-off migration: pulls the team abbreviation/name pairs that used to be
// duplicated on every `games` row out into their own `teams` table, and
// repoints `games` at it via home_team_id/away_team_id. Also creates the
// (initially empty) `bye_weeks` table - run `pnpm seed [season]` afterwards
// to populate it from ESPN's `teamsOnBye` data.
//
// Safe to run more than once: it no-ops if `games` has already been
// migrated. Not needed for a fresh database - lib/db.ts creates the new
// schema directly.
//
// Usage:
//   node scripts/migrate-teams-table.mts
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "data", "football-picks.db");

function main() {
  const db = new DatabaseSync(DB_PATH);

  const alreadyMigrated = db
    .prepare(
      "SELECT 1 FROM pragma_table_info('games') WHERE name = 'home_team_id'",
    )
    .get();
  if (alreadyMigrated) {
    console.log(
      "games table already uses home_team_id/away_team_id - nothing to do.",
    );
    return;
  }

  // node:sqlite enforces foreign keys by default, and `picks.game_id`
  // references `games(id)` - rebuilding `games` below (drop + recreate)
  // would trip that against existing picks. PRAGMA foreign_keys can't be
  // changed mid-transaction, so it has to be toggled off outside the BEGIN.
  db.exec("PRAGMA foreign_keys = OFF");
  db.exec("BEGIN");
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );
    `);

    const teams = db
      .prepare(
        `SELECT DISTINCT home_team_abbr AS id, home_team_name AS name FROM games
         UNION
         SELECT DISTINCT away_team_abbr, away_team_name FROM games`,
      )
      .all() as { id: string; name: string }[];

    const upsertTeam = db.prepare(
      `INSERT INTO teams (id, name) VALUES (?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name`,
    );
    for (const team of teams) upsertTeam.run(team.id, team.name);

    // SQLite can't drop/retype columns with data-dependent constraints in
    // place, so rebuild the table: create it with the new shape, copy the
    // old rows across (abbreviation columns become the new id columns,
    // since teams.id *is* the abbreviation), then swap it in.
    db.exec(`
      CREATE TABLE games_new (
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
    `);

    db.exec(`
      INSERT INTO games_new (
        id, season, week, kickoff, status, status_detail, venue,
        home_team_id, home_score, away_team_id, away_score
      )
      SELECT id, season, week, kickoff, status, status_detail, venue,
             home_team_abbr, home_score, away_team_abbr, away_score
      FROM games;
    `);

    db.exec("DROP TABLE games;");
    db.exec("ALTER TABLE games_new RENAME TO games;");
    db.exec(
      "CREATE INDEX IF NOT EXISTS idx_games_season_week ON games (season, week);",
    );

    db.exec(`
      CREATE TABLE IF NOT EXISTS bye_weeks (
        season INTEGER NOT NULL,
        week INTEGER NOT NULL,
        team_id TEXT NOT NULL REFERENCES teams (id),
        PRIMARY KEY (season, week, team_id)
      );
    `);

    db.exec("COMMIT");
    console.log(
      `Migrated ${teams.length} teams; games now references them by id.`,
    );
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  } finally {
    db.exec("PRAGMA foreign_keys = ON");
  }
}

main();
