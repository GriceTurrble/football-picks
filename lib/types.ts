export type GameStatus = "pre" | "in" | "post";

/** Which side of a game the user has picked to win. */
export type PickSelection = "home" | "away";

/** An NFL team, keyed by its ESPN abbreviation (matches /public/teams/<id>.png). */
export interface Team {
  id: string;
  name: string;
}

export interface Game {
  id: string;
  season: number;
  week: number;
  kickoff: string; // ISO 8601 timestamp
  status: GameStatus;
  statusDetail: string | null;
  venue: string | null;
  homeTeamId: string;
  homeTeamName: string;
  homeScore: number | null;
  awayTeamId: string;
  awayTeamName: string;
  awayScore: number | null;
}

/** A team with no game in a given season/week. */
export interface ByeWeek {
  season: number;
  week: number;
  teamId: string;
  teamName: string;
}
