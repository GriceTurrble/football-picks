"use client";

import { useSyncExternalStore } from "react";
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
  type PickSnapshot,
} from "@/lib/storage/pick-store";

/**
 * Subscribes to the persisted picks. The server, and the hydration render,
 * both see the empty "not ready" snapshot (see getServerSnapshot) - so server
 * and client markup match - and React re-renders with the stored picks
 * immediately afterwards, since reading localStorage is synchronous.
 */
export function usePickStore(): PickSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** True once the stored picks have been read in the browser. */
export function usePicksReady(): boolean {
  return usePickStore().ready;
}
