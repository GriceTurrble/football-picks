import { getDb } from "@/lib/db";
import type { ByeWeek } from "@/lib/types";

interface ByeWeekRow {
  season: number;
  week: number;
  team_id: string;
  team_name: string;
}

function rowToByeWeek(row: ByeWeekRow): ByeWeek {
  return {
    season: row.season,
    week: row.week,
    teamId: row.team_id,
    teamName: row.team_name,
  };
}

/** Teams with no game in a season, optionally narrowed to a single week. */
export function listByeWeeks(season: number, week?: number): ByeWeek[] {
  const db = getDb();
  const rows = (
    week === undefined
      ? db
          .prepare(
            `SELECT bye_weeks.season, bye_weeks.week, bye_weeks.team_id, teams.name AS team_name
             FROM bye_weeks
             JOIN teams ON teams.id = bye_weeks.team_id
             WHERE bye_weeks.season = ?
             ORDER BY bye_weeks.week ASC, teams.name ASC`
          )
          .all(season)
      : db
          .prepare(
            `SELECT bye_weeks.season, bye_weeks.week, bye_weeks.team_id, teams.name AS team_name
             FROM bye_weeks
             JOIN teams ON teams.id = bye_weeks.team_id
             WHERE bye_weeks.season = ? AND bye_weeks.week = ?
             ORDER BY teams.name ASC`
          )
          .all(season, week)
  ) as unknown as ByeWeekRow[];
  return rows.map(rowToByeWeek);
}
