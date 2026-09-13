export type GameStatus = "pre" | "in" | "post";

/** Which side of a game the user has picked to win. */
export type PickSelection = "home" | "away";

export interface Game {
  id: string;
  season: number;
  week: number;
  kickoff: string; // ISO 8601 timestamp
  status: GameStatus;
  statusDetail: string | null;
  venue: string | null;
  homeTeamAbbr: string;
  homeTeamName: string;
  homeScore: number | null;
  awayTeamAbbr: string;
  awayTeamName: string;
  awayScore: number | null;
}
