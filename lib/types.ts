export type GameStatus = "pre" | "in" | "post";

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
