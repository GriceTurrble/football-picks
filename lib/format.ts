export function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** `value` is an ISO string (odds) or a millisecond timestamp (schedule cache). */
export function formatRefreshedAt(value: string | number): string {
  return new Date(value).toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}
