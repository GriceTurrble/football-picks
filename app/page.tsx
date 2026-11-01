import { PicksPage } from "@/app/picks-page";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// The only thing this server component does is read the URL. Everything else
// - the schedule from ESPN, the picks from localStorage - is client-side; the
// schedule is fetched live and only picks persist, so there is no server data
// to gather here.
export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;

  const rawSeason = Number(firstParam(searchParams.season));
  const requestedSeason =
    Number.isInteger(rawSeason) && rawSeason > 0 ? rawSeason : undefined;

  const rawWeek = firstParam(searchParams.week);
  const parsedWeek = Number(rawWeek);
  const requestedWeek =
    rawWeek === "all"
      ? "all"
      : Number.isInteger(parsedWeek) && parsedWeek > 0
        ? parsedWeek
        : undefined;

  const lockOverride = firstParam(searchParams.override) === "1";

  return (
    <PicksPage
      requestedSeason={requestedSeason}
      requestedWeek={requestedWeek}
      lockOverride={lockOverride}
    />
  );
}
