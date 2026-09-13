import type { Game } from "@/lib/types";

export function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function statusLabel(game: Game): string {
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
