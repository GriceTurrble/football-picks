"use server";

import { revalidatePath } from "next/cache";
import { getGame } from "@/lib/games";
import { clearPick as removePick, setPick } from "@/lib/picks";
import type { PickSelection } from "@/lib/types";

function isPickSelection(value: unknown): value is PickSelection {
  return value === "home" || value === "away";
}

/**
 * Sets which team the user is picking to win a game. Bound with (gameId,
 * team, override) from the TeamBox form, but re-validated here since Server
 * Actions are reachable directly, not just through the UI that renders the
 * button.
 *
 * `override` is the "Lock override" toggle: it lifts the lock for a game
 * that has already kicked off, whether it's in progress or final.
 */
export async function pickWinner(gameId: string, team: PickSelection, override: boolean) {
  if (!isPickSelection(team)) {
    throw new Error("Invalid team selection");
  }

  const game = getGame(gameId);
  if (!game) {
    throw new Error("Game not found");
  }
  if (game.status !== "pre" && !override) {
    throw new Error("Picks are locked once a game starts");
  }

  setPick(gameId, team);
  revalidatePath("/");
}

/**
 * Removes the pick for a game entirely — used when clicking the already-
 * selected team, to unselect it. Same lock rules as `pickWinner` apply.
 */
export async function clearPick(gameId: string, override: boolean) {
  const game = getGame(gameId);
  if (!game) {
    throw new Error("Game not found");
  }
  if (game.status !== "pre" && !override) {
    throw new Error("Picks are locked once a game starts");
  }

  removePick(gameId);
  revalidatePath("/");
}
