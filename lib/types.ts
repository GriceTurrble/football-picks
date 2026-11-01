export type GameStatus = "pre" | "in" | "post";

/** Which side of a game the user has picked to win. */
export type PickSelection = "home" | "away";

/**
 * The one piece of state this app persists between visits: a winner pick for
 * a game, a score-total tiebreaker entry, or both. A row only exists while at
 * least one of them does - see lib/picks.ts.
 *
 * `season` and `teamName` are denormalized on purpose. `season` is how the
 * season picker is populated without a database to query, and `teamName`
 * lets the compiled-picks view render even when the schedule hasn't been
 * fetched yet (or ESPN is unreachable).
 */
export interface PickEntry {
  gameId: string;
  season: number;
  team?: PickSelection;
  /** Display name of the picked team, so a pick can render without the schedule. */
  teamName?: string;
  scoreTotal?: number;
  /** ISO 8601 timestamp of the last change to this row. */
  updatedAt: string;
}

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

/**
 * One season's schedule as fetched live from ESPN. Held only for the session
 * (see lib/season-cache.ts) - never persisted, unlike picks.
 */
export interface SeasonData {
  games: Game[];
  byes: ByeWeek[];
  /**
   * The week this slice covers, or null for a whole-season payload. Set by
   * the fetch and from the session cache, so the page can label the current
   * week even when the URL didn't name one.
   */
  week: number | null;
}

/** A price in every format ESPN's odds API expresses it in. */
export interface OddsPrice {
  value: number;
  displayValue: string;
  alternateDisplayValue: string;
  decimal: number;
  fraction: string;
  american: string;
}

/** A point-spread line with no accompanying price (just the number teams played). */
export interface OddsLine {
  alternateDisplayValue: string;
  american: string;
}

/** One side's spread/moneyline snapshot at a point in time (open/current/close). */
export interface OddsSideSnapshot {
  favorite?: boolean;
  pointSpread?: OddsLine;
  spread?: OddsPrice;
  moneyLine?: OddsPrice;
}

/** One side's line movement: how its spread/moneyline has moved over time. */
export interface OddsSideDetail {
  open?: OddsSideSnapshot;
  current?: OddsSideSnapshot;
  close?: OddsSideSnapshot;
}

/** The over/under total's snapshot at a point in time. */
export interface OddsTotalSnapshot {
  over?: OddsPrice;
  under?: OddsPrice;
  total?: OddsLine;
}

/** The over/under total's movement over time. */
export interface OddsTotalDetail {
  open?: OddsTotalSnapshot;
  current?: OddsTotalSnapshot;
  close?: OddsTotalSnapshot;
}

/** One side (home or away) of a game's odds. */
export interface OddsSide {
  moneyLine: number | null;
  spreadOdds: number | null;
  favorite: boolean | null;
  detail: OddsSideDetail;
}

/**
 * Betting odds for a game, from whichever single provider ESPN ranks
 * highest priority for that game (see lib/odds-sync.ts). `spread` is the
 * home team's line (negative when the home team is favored).
 */
export interface Odds {
  gameId: string;
  providerName: string;
  providerPriority: number | null;
  details: string | null;
  spread: number | null;
  overUnder: number | null;
  overOdds: number | null;
  underOdds: number | null;
  moneylineWinner: boolean | null;
  spreadWinner: boolean | null;
  home: OddsSide;
  away: OddsSide;
  total: OddsTotalDetail;
  fetchedAt: string;
}
