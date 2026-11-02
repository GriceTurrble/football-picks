import { Suspense } from "react";
import { PicksFromUrl } from "@/app/picks-from-url";

function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-4xl min-h-0 flex-1 flex-col gap-2 overflow-hidden pt-4 pb-24 px-2">
      <p className="px-2 py-4 text-sm text-zinc-600 dark:text-zinc-400">
        Loading…
      </p>
    </main>
  );
}

// The page is a shell: picks come from localStorage and the schedule from
// ESPN, both in the browser. It contributes the Suspense boundary
// useSearchParams needs - without one a static export refuses to prerender
// the page (see app/picks-from-url.tsx).
export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <PicksFromUrl />
    </Suspense>
  );
}
