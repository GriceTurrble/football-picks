"use client";

import Link from "next/link";
import { useState } from "react";

// Same key lib/storage/pick-store.ts reads on load - see STORAGE_KEY there.
const STORAGE_KEY = "football-picks:picks:v1";

interface PickEntry {
  gameId: string;
  season: number;
  team?: "home" | "away";
  teamName?: string;
  scoreTotal?: number;
  updatedAt: string;
}

// Temporary: carries the picks from the old SQLite database (exported by
// scripts/export-picks.mts into public/picks-import.json) into localStorage,
// which is the only place picks live now.
//
// Existing entries win over imported ones, so running this twice - or after
// making picks in the new app - never rolls anything back.
export default function ImportPicksPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleImport() {
    setBusy(true);
    setStatus("Importing…");
    try {
      const response = await fetch("/picks-import.json");
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const payload: unknown = await response.json();
      if (typeof payload !== "object" || payload === null) {
        throw new Error("picks-import.json is not an object");
      }

      const incoming = payload as Record<string, PickEntry>;
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const existing: Record<string, PickEntry> =
        raw === null ? {} : (JSON.parse(raw) as Record<string, PickEntry>);

      const merged = { ...incoming, ...existing };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

      const added = Object.keys(merged).length - Object.keys(existing).length;
      setStatus(
        `Imported ${added} picks (${Object.keys(merged).length} total stored). Open the app to see them.`,
      );
    } catch (error) {
      setStatus(
        `Import failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl min-h-0 flex-1 flex-col gap-3 overflow-hidden pt-4 pb-24 px-2">
      <h1 className="text-xl md:text-2xl font-semibold">Import picks</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        One-time migration from the old SQLite database. Reads{" "}
        <code className="font-mono">picks-import.json</code> and writes it into
        this browser&apos;s localStorage. Nothing else is carried over - the
        schedule and odds are fetched from ESPN.
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleImport}
          disabled={busy}
          className="cursor-pointer rounded-md border border-black/8 px-3 py-1.5 text-sm transition-colors hover:bg-black/5 disabled:opacity-60 dark:border-white/25 dark:hover:bg-white/5"
        >
          Import picks
        </button>
        <Link
          href="/"
          className="text-sm text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
        >
          Back to the picks
        </Link>
      </div>
      {status && (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{status}</p>
      )}
    </main>
  );
}
