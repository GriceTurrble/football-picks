// Shared timing constants used by both the server-side background refresh
// loop (lib/game-refresh.ts) and the client-side auto-refresh control
// (app/progress-refresh-status.tsx), so the two stay in lockstep.
export const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

// How far ahead of kickoff lib/sync-window.ts considers a game worth syncing
// - see needsSync there. One window drives everything (score/status and
// odds alike): wide enough to catch betting-line movement, which starts well
// before kickoff, not just once a game is about to start.
export const SYNC_WINDOW_MS = 24 * 60 * 60 * 1000;
