// Shared timing constants used by both the server-side background refresh
// loop (lib/game-refresh.ts) and the client-side auto-refresh control
// (app/progress-refresh-status.tsx), so the two stay in lockstep.
export const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

// How close to kickoff (in either direction) lib/sync-window.ts considers a
// game not already in progress worth syncing - see needsProgressSync there.
export const PROGRESS_SYNC_WINDOW_MS = 15 * 60 * 1000;

// How far ahead of kickoff lib/sync-window.ts considers a game's odds worth
// syncing - see needsOddsSync there. Much wider than PROGRESS_SYNC_WINDOW_MS:
// betting lines move for a full day or more before kickoff, not just in the
// last 15 minutes, which is all that matters for a game's score/status.
export const ODDS_SYNC_WINDOW_MS = 24 * 60 * 60 * 1000;
