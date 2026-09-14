// Loads an NFL regular-season schedule into the local SQLite database from
// ESPN's public (unofficial, unauthenticated) scoreboard API.
//
// Usage:
//   node scripts/seed.ts [season]
//
// `season` defaults to the current calendar year. Re-running for a season
// that's already loaded updates kickoff times, status, and scores in place.
//
// Once a season is seeded, the running server keeps it up to date on its
// own - see lib/game-refresh.ts - so this script only needs to run once per
// new season.
import { syncSeason } from "../lib/espn-sync.ts";

async function main() {
  const season = Number(process.argv[2]) || new Date().getFullYear();
  console.log(`Seeding ${season} NFL regular season into data/football-picks.db ...`);

  const total = await syncSeason(season, (week, eventCount) => {
    console.log(`  week ${week}: ${eventCount} games`);
  });

  console.log(`Done. Seeded/updated ${total} games for the ${season} season.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
