"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MdSave } from "react-icons/md";
import { Modal } from "@/app/modal";
import { downloadPicks, parseImportPayload } from "@/lib/pick-io";
import { deletePicks, writePicks } from "@/lib/storage/pick-store";
import type { Game, PickEntry } from "@/lib/types";

const ITEM_CLASS =
  "cursor-pointer rounded px-3 py-1.5 text-left text-sm whitespace-nowrap transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:text-zinc-400 disabled:hover:bg-transparent dark:hover:bg-white/5 dark:disabled:text-zinc-500";

const BUTTON_CLASS =
  "cursor-pointer rounded-md border border-black/8 px-3 py-1.5 text-sm transition-colors hover:bg-black/5 dark:border-white/25 dark:hover:bg-white/5";

type ClearScope = "week" | "season" | "all";

interface ImportStatus {
  ok: boolean;
  message: string;
}

// Everything that touches the stored picks as a whole: save a season to a
// file, load one back in, or wipe a slice of them. Grouped behind one
// floppy-disk button so the control row doesn't grow a button per action.
export function DataDropdown({
  season,
  week,
  games,
  picks,
}: {
  season: number;
  /** The single week on screen, or undefined when the whole season is. */
  week: number | undefined;
  /** Every game currently on screen - how "this week" is scoped. */
  games: Game[];
  /** The whole stored map, not just the games on screen. */
  picks: Record<string, PickEntry>;
}) {
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clearScope, setClearScope] = useState<ClearScope>("week");
  const fileInputId = useId();
  const scopeId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Same close behaviour as app/filter-dropdown.tsx: outside click or Escape.
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const seasonCount = Object.values(picks).filter(
    (pick) => pick.season === season,
  ).length;
  const allCount = Object.keys(picks).length;

  const weekGameIds = week === undefined ? [] : games.map((game) => game.id);
  const weekCount = weekGameIds.filter((gameId) => gameId in picks).length;

  // "This week" only makes sense with one week on screen; otherwise fall back
  // to the season so the delete button always has a meaningful target.
  const activeScope: ClearScope = week === undefined ? "season" : clearScope;
  const clearCount =
    activeScope === "week"
      ? weekCount
      : activeScope === "all"
        ? allCount
        : seasonCount;

  function openImport() {
    setOpen(false);
    setImportStatus(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setImportOpen(true);
  }

  function openClear() {
    setOpen(false);
    setClearScope(week === undefined ? "season" : "week");
    setClearOpen(true);
  }

  // Selecting a file only stages it - nothing is read or written until the
  // Import button in the modal's footer is clicked.
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setImportStatus(null);
    setSelectedFile(event.target.files?.[0] ?? null);
  }

  async function handleImport() {
    if (!selectedFile) return;

    setImporting(true);
    setImportStatus(null);
    try {
      const raw: unknown = JSON.parse(await selectedFile.text());
      const { entries, skipped } = parseImportPayload(raw);

      // Compared before the write: writePicks merges into these same rows.
      const existing = new Set(Object.keys(picks));
      const updated = entries.filter((entry) => existing.has(entry.gameId));
      writePicks(entries);

      const skippedNote = skipped > 0 ? `, ${skipped} skipped` : "";
      setImportStatus({
        ok: true,
        message: `Imported ${entries.length} picks — ${
          entries.length - updated.length
        } new, ${updated.length} updated${skippedNote}.`,
      });
    } catch (error) {
      setImportStatus({
        ok: false,
        message: `Import failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    } finally {
      setImporting(false);
      setSelectedFile(null);
      // Clears the picker so the same file can be chosen again, and so the
      // input never claims to hold a file that has already been imported.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleClear() {
    if (activeScope === "week") {
      deletePicks(weekGameIds);
    } else if (activeScope === "season") {
      deletePicks(
        Object.values(picks)
          .filter((pick) => pick.season === season)
          .map((pick) => pick.gameId),
      );
    } else {
      deletePicks(Object.keys(picks));
    }
    setClearOpen(false);
  }

  return (
    <>
      <div ref={ref} className="md:relative shrink-0">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label="Data"
          title="Data"
          className={`rounded-md border p-1.5 text-sm transition-colors ${
            open
              ? "border-black/8 bg-black/5 dark:border-white/25 dark:hover:border-white/50 dark:bg-white/5"
              : "border-black/8 hover:bg-black/5 dark:border-white/25 dark:hover:border-white/50 dark:hover:bg-white/5"
          }`}
        >
          <MdSave className="h-4.5 w-4.5" />
        </button>

        {open && (
          // Same stacking rule as app/filter-dropdown.tsx: above the game
          // list's sticky week headers.
          <div className="absolute top-full left-0 z-20 mt-1 flex flex-col rounded-md border-2 border-black/8 bg-background p-1 shadow-lg dark:border-white/50">
            <button
              type="button"
              disabled={seasonCount === 0}
              title={
                seasonCount === 0
                  ? `No ${season} picks to export`
                  : `Download the ${season} picks as JSON`
              }
              onClick={() => {
                setOpen(false);
                downloadPicks(picks, season);
              }}
              className={ITEM_CLASS}
            >
              Export {season} picks
            </button>
            <button type="button" onClick={openImport} className={ITEM_CLASS}>
              Import…
            </button>
            <button type="button" onClick={openClear} className={ITEM_CLASS}>
              Clear…
            </button>
          </div>
        )}
      </div>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import picks"
        footer={
          <>
            <button
              type="button"
              onClick={() => setImportOpen(false)}
              className={BUTTON_CLASS}
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={selectedFile === null || importing}
              className="cursor-pointer rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {importing ? "Importing…" : "Import"}
            </button>
          </>
        }
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Choose a JSON file exported from this app, then click Import. Its
          picks are merged into the ones already in this browser; anything the
          file doesn&apos;t mention is left alone.
        </p>
        <label htmlFor={fileInputId} className="text-sm font-medium">
          Picks file
        </label>
        <input
          id={fileInputId}
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          disabled={importing}
          onChange={handleFileChange}
          className="cursor-pointer text-sm file:mr-2 file:cursor-pointer file:rounded-md file:border file:border-black/8 file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:text-foreground hover:file:bg-black/5 dark:file:border-white/25 dark:hover:file:bg-white/5"
        />
        {importStatus && (
          <p
            className={`text-sm ${
              importStatus.ok
                ? "text-zinc-700 dark:text-zinc-300"
                : "text-red-700 dark:text-red-400"
            }`}
          >
            {importStatus.message}
          </p>
        )}
      </Modal>

      <Modal
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        title="Clear picks"
        footer={
          <>
            <button
              type="button"
              onClick={() => setClearOpen(false)}
              className={BUTTON_CLASS}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={clearCount === 0}
              className="cursor-pointer rounded-md border border-red-600 bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500 dark:bg-red-500 dark:hover:bg-red-600"
            >
              Delete {clearCount} pick{clearCount === 1 ? "" : "s"}
            </button>
          </>
        }
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Picks are deleted from this browser only, and there is no undo. Export
          first if you might want them back.
        </p>
        <label htmlFor={scopeId} className="text-sm font-medium">
          Delete
        </label>
        <select
          id={scopeId}
          value={activeScope}
          onChange={(event) => setClearScope(event.target.value as ClearScope)}
          className="w-full rounded-md border border-black/8 bg-transparent px-2 py-1.5 text-sm dark:border-white/25"
        >
          {week !== undefined && (
            <option value="week">
              Week {week} ({weekCount} pick{weekCount === 1 ? "" : "s"})
            </option>
          )}
          <option value="season">
            {season} season ({seasonCount} pick{seasonCount === 1 ? "" : "s"})
          </option>
          <option value="all">
            Everything ({allCount} pick{allCount === 1 ? "" : "s"})
          </option>
        </select>
      </Modal>
    </>
  );
}
