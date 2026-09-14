// Shared timing constants used by both the server-side background refresh
// loop (lib/game-refresh.ts) and the client-side auto-refresh control
// (app/refresh-status.tsx), so the two stay in lockstep.
export const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

// How close to kickoff (in either direction) lib/sync-window.ts considers a
// game not already in progress worth syncing - see needsSync there.
export const SYNC_WINDOW_MS = 15 * 60 * 1000;
