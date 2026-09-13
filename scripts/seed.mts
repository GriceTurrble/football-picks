// Loads an NFL regular-season schedule into the local SQLite database from
// ESPN's public (unofficial, unauthenticated) scoreboard API.
//
// Usage:
//   node scripts/seed.ts [season]
//
// `season` defaults to the current calendar year. Re-running for a season
// that's already loaded updates kickoff times, status, and scores in place.
import { getDb } from "../lib/db.ts";

const SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
const REGULAR_SEASON = 2;
const REGULAR_SEASON_WEEKS = 18;

interface EspnCompetitor {
  homeAway: "home" | "away";
  score?: string;
  team: {
    abbreviation: string;
    displayName: string;
  };
}

interface EspnEvent {
  id: string;
  date: string;
  week?: { number: number };
  competitions: Array<{
    venue?: { fullName?: string };
    status: {
      type: { state: string; detail: string };
    };
    competitors: EspnCompetitor[];
  }>;
}

interface EspnScoreboardResponse {
  events?: EspnEvent[];
}

async function fetchWeek(season: number, week: number): Promise<EspnEvent[]> {
  const url = `${SCOREBOARD_URL}?seasontype=${REGULAR_SEASON}&year=${season}&week=${week}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ESPN request failed for week ${week}: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as EspnScoreboardResponse;
  return data.events ?? [];
}

async function main() {
  const season = Number(process.argv[2]) || new Date().getFullYear();
  console.log(`Seeding ${season} NFL regular season into data/football-picks.db ...`);

  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO games (
      id, season, week, kickoff, status, status_detail, venue,
      home_team_abbr, home_team_name, home_score,
      away_team_abbr, away_team_name, away_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      kickoff = excluded.kickoff,
      status = excluded.status,
      status_detail = excluded.status_detail,
      venue = excluded.venue,
      home_score = excluded.home_score,
      away_score = excluded.away_score
  `);

  let total = 0;
  for (let week = 1; week <= REGULAR_SEASON_WEEKS; week++) {
    const events = await fetchWeek(season, week);
    for (const event of events) {
      const competition = event.competitions[0];
      const home = competition?.competitors.find((c) => c.homeAway === "home");
      const away = competition?.competitors.find((c) => c.homeAway === "away");
      if (!competition || !home || !away) continue;

      const state = competition.status.type.state;
      const score = (raw: string | undefined) =>
        state === "pre" || raw === undefined ? null : Number(raw);

      upsert.run(
        event.id,
        season,
        event.week?.number ?? week,
        event.date,
        state,
        competition.status.type.detail,
        competition.venue?.fullName ?? null,
        home.team.abbreviation,
        home.team.displayName,
        score(home.score),
        away.team.abbreviation,
        away.team.displayName,
        score(away.score)
      );
      total += 1;
    }
    console.log(`  week ${week}: ${events.length} games`);
  }

  console.log(`Done. Seeded/updated ${total} games for the ${season} season.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
