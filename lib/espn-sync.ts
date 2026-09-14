// Shared logic for pulling an NFL regular-season schedule from ESPN's public
// (unofficial, unauthenticated) scoreboard API and upserting it into the
// local database. Used by both the one-off seed script (scripts/seed.mts)
// and the background refresh loop (lib/game-refresh.ts).
import type { DatabaseSync } from "node:sqlite";
import { getDb } from "@/lib/db";

const SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
const REGULAR_SEASON = 2;
export const REGULAR_SEASON_WEEKS = 18;

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

function upsertEvents(
  db: DatabaseSync,
  season: number,
  week: number,
  events: EspnEvent[]
): number {
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

  let count = 0;
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
    count += 1;
  }
  return count;
}

/**
 * Fetches every regular-season week for a season from ESPN and upserts it
 * into the local database. Safe to call repeatedly - kickoff time, status,
 * and scores are updated in place; everything else about an existing game
 * row is left alone. Returns the total number of games written.
 */
export async function syncSeason(
  season: number,
  onWeek?: (week: number, eventCount: number) => void
): Promise<number> {
  const db = getDb();
  let total = 0;
  for (let week = 1; week <= REGULAR_SEASON_WEEKS; week++) {
    const events = await fetchWeek(season, week);
    total += upsertEvents(db, season, week, events);
    onWeek?.(week, events.length);
  }
  return total;
}
