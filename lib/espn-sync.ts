// Shared logic for pulling an NFL regular-season schedule from ESPN's public
// (unofficial, unauthenticated) scoreboard API and upserting it into the
// local database. Used by both the one-off seed script (scripts/seed.mts)
// and the background refresh loop (lib/game-refresh.ts).
import type { DatabaseSync } from "node:sqlite";
// Relative (not "@/lib/...") because this file is also imported by
// scripts/seed.mts, which runs under plain `node` - no bundler to resolve
// the "@/*" alias there.
import { getDb } from "./db.ts";
import { markSynced } from "./sync-status.ts";

const SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
const REGULAR_SEASON = 2;
export const REGULAR_SEASON_WEEKS = 18;

interface EspnTeamRef {
  abbreviation: string;
  displayName: string;
}

interface EspnCompetitor {
  homeAway: "home" | "away";
  score?: string;
  team: EspnTeamRef;
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
  // ESPN names each week's byes directly, rather than requiring us to infer
  // them from which teams have no event that week.
  week?: { number: number; teamsOnBye?: EspnTeamRef[] };
  events?: EspnEvent[];
}

interface WeekData {
  events: EspnEvent[];
  teamsOnBye: EspnTeamRef[];
}

async function fetchWeek(season: number, week: number): Promise<WeekData> {
  const url = `${SCOREBOARD_URL}?seasontype=${REGULAR_SEASON}&year=${season}&week=${week}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `ESPN request failed for week ${week}: ${res.status} ${res.statusText}`,
    );
  }
  const data = (await res.json()) as EspnScoreboardResponse;
  return { events: data.events ?? [], teamsOnBye: data.week?.teamsOnBye ?? [] };
}

// `games` and `bye_weeks` both reference `teams` by id (the ESPN
// abbreviation), so every team mentioned anywhere in a week's response gets
// upserted here first - keeping its display name current is a nice side
// effect, not the point.
function upsertTeam(db: DatabaseSync, team: EspnTeamRef): void {
  db.prepare(
    `INSERT INTO teams (id, name) VALUES (?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name`,
  ).run(team.abbreviation, team.displayName);
}

function upsertEvents(
  db: DatabaseSync,
  season: number,
  week: number,
  events: EspnEvent[],
): number {
  const upsert = db.prepare(`
    INSERT INTO games (
      id, season, week, kickoff, status, status_detail, venue,
      home_team_id, home_score,
      away_team_id, away_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

    upsertTeam(db, home.team);
    upsertTeam(db, away.team);

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
      score(home.score),
      away.team.abbreviation,
      score(away.score),
    );
    count += 1;
  }
  return count;
}

function upsertByes(
  db: DatabaseSync,
  season: number,
  week: number,
  teamsOnBye: EspnTeamRef[],
): number {
  // No mutable columns beyond the (season, week, team) key itself, so an
  // existing row just needs to survive re-runs, not be updated.
  const upsert = db.prepare(
    `INSERT OR IGNORE INTO bye_weeks (season, week, team_id) VALUES (?, ?, ?)`,
  );

  let count = 0;
  for (const team of teamsOnBye) {
    upsertTeam(db, team);
    upsert.run(season, week, team.abbreviation);
    count += 1;
  }
  return count;
}

/**
 * Fetches every regular-season week for a season from ESPN and upserts it
 * into the local database. Safe to call repeatedly - kickoff time, status,
 * and scores are updated in place; everything else about an existing game
 * row is left alone. Returns the total number of games written.
 *
 * Every caller (the background refresh loop, a manual refresh, the one-off
 * seed script) counts as "we just checked ESPN for this season", so the
 * season_sync stamp lives here rather than being repeated at each call site
 * - see lib/sync-status.ts.
 */
export async function syncSeason(
  season: number,
  onWeek?: (week: number, eventCount: number, byeCount: number) => void,
): Promise<number> {
  const db = getDb();
  let total = 0;
  for (let week = 1; week <= REGULAR_SEASON_WEEKS; week++) {
    const { events, teamsOnBye } = await fetchWeek(season, week);
    const eventCount = upsertEvents(db, season, week, events);
    const byeCount = upsertByes(db, season, week, teamsOnBye);
    total += eventCount;
    onWeek?.(week, eventCount, byeCount);
  }
  markSynced(season);
  return total;
}
