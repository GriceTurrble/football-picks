// Live ESPN scoreboard access. This module only fetches and normalizes:
// nothing here caches, persists, or writes to a store - see
// lib/season-cache.ts for the session cache, and lib/storage/pick-store.ts
// for the one thing that does survive a reload.
//
// Two ways to load a season, both verified against the real API:
//
//  - fetchWeek: one request for a single week. ESPN includes that week's
//    teamsOnBye directly, so byes come for free (~150 KB).
//  - fetchSeason: two requests (an NFL season spans two calendar years, so
//    `dates=<season>` alone misses the January games). All 18 weeks, ~3.6 MB,
//    and byes are derived from the schedule.
import type { ByeWeek, Game, GameStatus, SeasonData } from "./types.ts";

const SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
const REGULAR_SEASON = 2;

/** Regular-season weeks the app cares about. Pre-2021 seasons simply have fewer. */
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
  season?: { year: number; type: number };
  competitions: Array<{
    venue?: { fullName?: string };
    status: { type: { state: string; detail: string } };
    competitors: EspnCompetitor[];
  }>;
}

interface EspnScoreboardResponse {
  week?: { number: number; teamsOnBye?: EspnTeamRef[] };
  events?: EspnEvent[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `ESPN request failed: ${response.status} ${response.statusText}`,
    );
  }
  return (await response.json()) as T;
}

// The bulk (date-ranged) response also returns the tail of the previous
// season and the start of the next one, so every event is checked against the
// season it claims to belong to.
function belongsToRegularSeason(event: EspnEvent, season: number): boolean {
  const meta = event.season;
  if (!meta) return true;
  return meta.year === season && meta.type === REGULAR_SEASON;
}

function toStatus(state: string): GameStatus {
  return state === "in" || state === "post" ? state : "pre";
}

function toGame(
  event: EspnEvent,
  season: number,
  fallbackWeek?: number,
): Game | null {
  const week = event.week?.number ?? fallbackWeek;
  const competition = event.competitions[0];
  if (week === undefined || !competition) return null;

  const home = competition.competitors.find((c) => c.homeAway === "home");
  const away = competition.competitors.find((c) => c.homeAway === "away");
  if (!home || !away) return null;

  const status = toStatus(competition.status.type.state);
  const score = (raw: string | undefined): number | null => {
    if (status === "pre" || raw === undefined) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  };

  return {
    id: event.id,
    season,
    week,
    kickoff: event.date,
    status,
    statusDetail: competition.status.type.detail,
    venue: competition.venue?.fullName ?? null,
    homeTeamId: home.team.abbreviation,
    homeTeamName: home.team.displayName,
    homeScore: score(home.score),
    awayTeamId: away.team.abbreviation,
    awayTeamName: away.team.displayName,
    awayScore: score(away.score),
  };
}

function compareGames(a: Game, b: Game): number {
  return a.week - b.week || a.kickoff.localeCompare(b.kickoff);
}

/**
 * Derives bye weeks from a complete schedule.
 *
 * ESPN names byes directly only on the per-week endpoint, so a bulk season
 * fetch has to infer them. Every NFL team has exactly one bye, which makes
 * the inference exact - but only when the schedule is complete, so an
 * incomplete payload (a partial request, a season not published yet) returns
 * nothing rather than marking every team as on bye for every missing week.
 */
function deriveByes(season: number, games: Game[]): ByeWeek[] {
  if (games.length === 0) return [];

  const teamNames = new Map<string, string>();
  const playedWeeks = new Map<string, Set<number>>();
  const weeksPresent = new Set<number>();

  for (const game of games) {
    weeksPresent.add(game.week);
    for (const [teamId, teamName] of [
      [game.homeTeamId, game.homeTeamName],
      [game.awayTeamId, game.awayTeamName],
    ] as const) {
      teamNames.set(teamId, teamName);
      let weeks = playedWeeks.get(teamId);
      if (!weeks) {
        weeks = new Set();
        playedWeeks.set(teamId, weeks);
      }
      weeks.add(game.week);
    }
  }

  const expectedGamesPerTeam = weeksPresent.size - 1;
  const looksComplete =
    teamNames.size === 32 &&
    [...playedWeeks.values()].every(
      (weeks) => weeks.size === expectedGamesPerTeam,
    );
  if (!looksComplete) {
    console.warn("[espn] schedule incomplete - skipping bye-week derivation");
    return [];
  }

  const byes: ByeWeek[] = [];
  for (const [teamId, teamName] of teamNames) {
    const weeks = playedWeeks.get(teamId) ?? new Set<number>();
    for (const week of weeksPresent) {
      if (!weeks.has(week)) byes.push({ season, week, teamId, teamName });
    }
  }
  return byes.sort(
    (a, b) => a.week - b.week || a.teamName.localeCompare(b.teamName),
  );
}

/** Fetches one regular-season week, with ESPN's own bye list. */
export async function fetchWeek(
  season: number,
  week: number,
): Promise<SeasonData> {
  const url = `${SCOREBOARD_URL}?seasontype=${REGULAR_SEASON}&year=${season}&week=${week}`;
  const data = await fetchJson<EspnScoreboardResponse>(url);

  const games: Game[] = [];
  for (const event of data.events ?? []) {
    if (!belongsToRegularSeason(event, season)) continue;
    const game = toGame(event, season, week);
    if (game) games.push(game);
  }

  const byes: ByeWeek[] = (data.week?.teamsOnBye ?? []).map((team) => ({
    season,
    week,
    teamId: team.abbreviation,
    teamName: team.displayName,
  }));

  return { games: games.sort(compareGames), byes };
}

async function fetchCalendarYear(
  season: number,
  calendarYear: number,
): Promise<Game[]> {
  const url = `${SCOREBOARD_URL}?seasontype=${REGULAR_SEASON}&year=${season}&dates=${calendarYear}&limit=1000`;
  const data = await fetchJson<EspnScoreboardResponse>(url);

  const games: Game[] = [];
  for (const event of data.events ?? []) {
    if (!belongsToRegularSeason(event, season)) continue;
    const game = toGame(event, season);
    if (game) games.push(game);
  }
  return games;
}

/**
 * Fetches a whole regular-season schedule in two requests, one per calendar
 * year it spans. Partial success is deliberate: if only one of the two
 * requests fails, the games that did arrive are still returned (bye
 * derivation is skipped because the schedule no longer looks complete).
 */
export async function fetchSeason(season: number): Promise<SeasonData> {
  const [first, second] = await Promise.allSettled([
    fetchCalendarYear(season, season),
    fetchCalendarYear(season, season + 1),
  ]);

  if (first.status === "rejected" && second.status === "rejected") {
    throw first.reason;
  }
  if (first.status === "rejected" || second.status === "rejected") {
    console.warn("[espn] partial season data returned", {
      [`dates=${season}`]: first.status,
      [`dates=${season + 1}`]: second.status,
    });
  }

  const byId = new Map<string, Game>();
  for (const result of [first, second]) {
    if (result.status !== "fulfilled") continue;
    for (const game of result.value) byId.set(game.id, game);
  }

  const games = [...byId.values()].sort(compareGames);
  return { games, byes: deriveByes(season, games) };
}
