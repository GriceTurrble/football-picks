// Reading and writing the pick store as a standalone JSON file, for the
// Export / Import items in app/data-dropdown.tsx.
//
// The file is a plain array - one row per game - rather than the keyed map
// localStorage holds, and it deliberately leaves `updatedAt` out: that's
// bookkeeping for this browser, not something worth diffing between exports.
// Rows are sorted so exporting the same picks twice produces byte-identical
// files.
import type { PickEntry, PickSelection } from "@/lib/types";

/** One row of an exported JSON file. */
export interface ExportedPick {
  gameId: string;
  season: number;
  team?: PickSelection;
  teamName?: string;
  scoreTotal?: number;
}

export interface ImportResult {
  /** Valid rows, keyed by game id and stamped with the import time. */
  entries: PickEntry[];
  /** Rows the file had that were unusable (or repeats of an earlier row). */
  skipped: number;
}

/** One season's picks as export rows, sorted by season then game id. */
export function toExportPayload(
  picks: Record<string, PickEntry>,
  season: number,
): ExportedPick[] {
  return Object.values(picks)
    .filter((pick) => pick.season === season)
    .map((pick) => {
      const row: ExportedPick = {
        gameId: pick.gameId,
        season: pick.season,
      };
      if (pick.team) {
        row.team = pick.team;
        if (pick.teamName !== undefined) row.teamName = pick.teamName;
      }
      if (pick.scoreTotal !== undefined) row.scoreTotal = pick.scoreTotal;
      return row;
    })
    .sort((a, b) => a.season - b.season || a.gameId.localeCompare(b.gameId));
}

// A row is valid when it names a game and a season, and everything else it
// carries is the right shape. A row with neither a winner nor a score total
// has nothing to store - the app deletes such rows - so it counts as invalid.
function parseRow(value: unknown): ExportedPick | null {
  if (typeof value !== "object" || value === null) return null;

  const row = value as Record<string, unknown>;
  if (typeof row.gameId !== "string" || row.gameId === "") return null;
  if (typeof row.season !== "number" || !Number.isInteger(row.season)) {
    return null;
  }

  const team = row.team;
  if (team !== undefined && team !== "home" && team !== "away") return null;
  if (row.teamName !== undefined && typeof row.teamName !== "string") {
    return null;
  }

  const scoreTotal = row.scoreTotal;
  if (
    scoreTotal !== undefined &&
    (typeof scoreTotal !== "number" ||
      !Number.isInteger(scoreTotal) ||
      scoreTotal < 0)
  ) {
    return null;
  }

  if (team === undefined && scoreTotal === undefined) return null;

  const parsed: ExportedPick = { gameId: row.gameId, season: row.season };
  if (team !== undefined) {
    parsed.team = team;
    if (typeof row.teamName === "string") parsed.teamName = row.teamName;
  }
  if (scoreTotal !== undefined) parsed.scoreTotal = scoreTotal;
  return parsed;
}

/**
 * Validates an imported file row by row rather than all-or-nothing, so one
 * malformed row doesn't throw away the rest. Throws only when the file isn't
 * an array at all.
 *
 * `now` is the timestamp every imported row gets: the file carries no
 * `updatedAt` of its own, and from this browser's point of view the import is
 * when the pick was last touched.
 */
export function parseImportPayload(
  raw: unknown,
  now: Date = new Date(),
): ImportResult {
  if (!Array.isArray(raw)) {
    throw new Error("Expected a JSON array of picks");
  }

  const updatedAt = now.toISOString();
  const byGameId = new Map<string, PickEntry>();
  let skipped = 0;

  for (const value of raw) {
    const row = parseRow(value);
    // A repeat id keeps whichever row came first and counts the later one as
    // skipped, so the summary reflects every row the file had.
    if (row === null || byGameId.has(row.gameId)) {
      skipped += 1;
      continue;
    }
    byGameId.set(row.gameId, { ...row, updatedAt });
  }

  return { entries: [...byGameId.values()], skipped };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Filesystem-safe local-time filename, e.g.
 * `football-picks-S2026-20261102-143512.json`.
 */
export function exportFilename(season: number, now: Date = new Date()): string {
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `football-picks-S${season}-${stamp}.json`;
}

/**
 * Hands one season's picks to the browser as a download. Returns the number of
 * rows written (0 when that season has no picks, in which case nothing is
 * downloaded).
 */
export function downloadPicks(
  picks: Record<string, PickEntry>,
  season: number,
  now: Date = new Date(),
): number {
  const payload = toExportPayload(picks, season);
  if (payload.length === 0) return 0;

  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = exportFilename(season, now);
  anchor.click();
  URL.revokeObjectURL(url);

  return payload.length;
}
