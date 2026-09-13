import type { Game } from "@/lib/types";

export function StatusLabel({ game }: { game: Game }) {
  switch (game.status) {
    case "pre":
      return "Scheduled";
    case "in":
      return game.statusDetail ?? "In progress";
    case "post":
      return "Final";
    default:
      return game.statusDetail ?? game.status;
  }
}
