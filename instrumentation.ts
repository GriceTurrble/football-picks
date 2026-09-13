// Runs once when the Next.js server starts. See
// node_modules/next/dist/docs/01-app/02-guides/instrumentation.md.
export async function register() {
  // node:sqlite (via lib/db.ts) isn't available in the edge runtime, and we
  // only want the refresh loop running against an actual server, not while
  // `next build` loads this file to trace it.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { startGameRefresh } = await import("@/lib/game-refresh");
  startGameRefresh();
}
