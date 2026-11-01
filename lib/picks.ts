// The user's picks: reads come from the persisted pick store
// (lib/storage/pick-store.ts), writes go straight back to it. There is no
// server involved, so the kickoff lock check (formerly a Server Action's job)
// happens here - against the schedule the session cache has loaded.
//
// A row exists only while it holds a winner pick, a score-total entry, or
// both; clearing the last of the two deletes the row.
import { deletePick, getSnapshot, writePick } from "@/lib/storage/pick-store";
import type { Game, PickEntry, PickSelection } from "@/lib/types";

export function isPickSelection(value: unknown): value is PickSelection {
  return value === "home" || value === "away";
}

/** Picks for a set of games, keyed by game id. Games with no pick are omitted. */
export function listPicks(
  picks: Record<string, PickEntry>,
  gameIds: string[],
): Record<string, PickSelection> {
  const result: Record<string, PickSelection> = {};
  for (const gameId of gameIds) {
    const team = picks[gameId]?.team;
    if (team) result[gameId] = team;
  }
  return result;
}

/**
 * Score-total tiebreaker entries for a set of games, keyed by game id.
 * Games with no entry are omitted.
 */
export function listScoreTotals(
  picks: Record<string, PickEntry>,
  gameIds: string[],
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const gameId of gameIds) {
    const total = picks[gameId]?.scoreTotal;
    if (total !== undefined) result[gameId] = total;
  }
  return result;
}

function currentRow(gameId: string): PickEntry | undefined {
  return getSnapshot().picks[gameId];
}

// Picks lock once a game kicks off - there's no point (or fairness) in
// letting a pick change once the outcome is already in motion. The Lock
// Override toggle lifts this for any game that's already started, in-progress
// or final. Client-side only, so this is a guard rail, not an enforcement
// mechanism: the only adversary is the person using the app.
function assertUnlocked(game: Game, override: boolean): void {
  if (game.status !== "pre" && !override) {
    throw new Error("Picks are locked once a game starts");
  }
}

function pickedTeamName(game: Game, team: PickSelection): string {
  return team === "home" ? game.homeTeamName : game.awayTeamName;
}

// Writes the row, or deletes it once neither a pick nor a score total is
// left. `season` and `teamName` are denormalized so the compiled-picks view
// keeps working with no schedule loaded - see lib/types.ts#PickEntry.
function save(game: Game, fields: Partial<PickEntry>): void {
  const entry: PickEntry = {
    gameId: game.id,
    season: game.season,
    updatedAt: new Date().toISOString(),
    ...fields,
  };

  if (entry.team === undefined && entry.scoreTotal === undefined) {
    deletePick(entry.gameId);
    return;
  }
  writePick(entry);
}

/** Sets which team the user is picking to win a game. */
export function setPick(
  game: Game,
  team: PickSelection,
  override: boolean,
): void {
  if (!isPickSelection(team)) throw new Error("Invalid team selection");
  assertUnlocked(game, override);

  save(game, {
    team,
    teamName: pickedTeamName(game, team),
    scoreTotal: currentRow(game.id)?.scoreTotal,
  });
}

/** Removes a game's winner pick, leaving any score-total entry in place. */
export function clearPick(game: Game, override: boolean): void {
  assertUnlocked(game, override);
  save(game, { scoreTotal: currentRow(game.id)?.scoreTotal });
}

/** Sets (or replaces) a game's score-total tiebreaker entry. */
export function setScoreTotal(
  game: Game,
  total: number,
  override: boolean,
): void {
  assertUnlocked(game, override);

  const existing = currentRow(game.id);
  save(game, {
    team: existing?.team,
    teamName: existing?.teamName,
    scoreTotal: total,
  });
}

/** Removes a game's score-total entry, leaving any winner pick in place. */
export function clearScoreTotal(game: Game, override: boolean): void {
  assertUnlocked(game, override);

  const existing = currentRow(game.id);
  save(game, { team: existing?.team, teamName: existing?.teamName });
}

/**
 * Parses and saves a score-total entry straight from the input's text.
 * Empty input (or 0) clears the entry; anything else must be a whole,
 * non-negative number - the UI only accepts digits, so an error here means
 * something bypassed it.
 */
export function updateScoreTotal(
  game: Game,
  rawValue: string,
  override: boolean,
): void {
  assertUnlocked(game, override);

  const trimmed = rawValue.trim();
  if (trimmed === "") {
    clearScoreTotal(game, override);
    return;
  }

  const total = Number(trimmed);
  if (!Number.isInteger(total) || total < 0) {
    throw new Error("Score total must be a positive whole number");
  }

  if (total === 0) {
    clearScoreTotal(game, override);
  } else {
    setScoreTotal(game, total, override);
  }
}
