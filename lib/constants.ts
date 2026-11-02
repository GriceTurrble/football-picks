// How often the page re-checks ESPN while something is live - see
// app/progress-refresh-status.tsx, the only thing that reads this now.
export const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

// How far ahead of kickoff lib/sync-window.ts considers a game worth syncing
// - see needsSync there. One window drives everything (score/status and
// odds alike): wide enough to catch betting-line movement, which starts well
// before kickoff, not just once a game is about to start.
export const SYNC_WINDOW_MS = 24 * 60 * 60 * 1000;
