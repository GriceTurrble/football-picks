// Shared timing constants used by both the server-side background refresh
// loop (lib/game-refresh.ts) and the client-side auto-refresh control
// (app/refresh-status.tsx), so the two stay in lockstep.
export const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
