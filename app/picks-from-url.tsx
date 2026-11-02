"use client";

import { useSearchParams } from "next/navigation";
import { PicksPage } from "@/app/picks-page";

// Reads the season/week/override the URL asks for. This was a Server
// Component's `searchParams` prop, but a static export has no per-request
// render to read it in - so it happens here, on the client, which also means
// the router pushes in WeekSelect/SeasonSelect re-render it without a reload.
export function PicksFromUrl() {
  const searchParams = useSearchParams();

  const rawSeason = Number(searchParams.get("season") ?? undefined);
  const requestedSeason =
    Number.isInteger(rawSeason) && rawSeason > 0 ? rawSeason : undefined;

  const rawWeek = searchParams.get("week");
  const parsedWeek = Number(rawWeek);
  const requestedWeek =
    rawWeek === "all"
      ? "all"
      : Number.isInteger(parsedWeek) && parsedWeek > 0
        ? parsedWeek
        : undefined;

  const lockOverride = searchParams.get("override") === "1";

  return (
    <PicksPage
      requestedSeason={requestedSeason}
      requestedWeek={requestedWeek}
      lockOverride={lockOverride}
    />
  );
}
