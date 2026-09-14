import type { Game } from "@/lib/types";

export function StatusLabel({ game }: { game: Game }) {
  switch (game.status) {
    case "pre":
      return "Scheduled";
    case "in":
      return game.statusDetail ?? "In progress";
    case "post":
      // ESPN's detail distinguishes "Final" from "Final/OT" (or "Final/2OT",
      // etc.) - pass it through the same way the "in" case does instead of
      // flattening every finished game to a plain "Final".
      return game.statusDetail ?? "Final";
    default:
      return game.statusDetail ?? game.status;
  }
}
