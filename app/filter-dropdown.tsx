"use client";

import { useEffect, useRef, useState } from "react";
import { MdTune } from "react-icons/md";

// Small popover for grouping less-frequently-used filters (currently just
// game status) behind a single "Filters" button, so the control row doesn't
// have to grow inline every time another filter is added. Closes on an
// outside click or Escape, similar to a native <select>.
export function FilterDropdown({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={ref} className="md:relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Filters"
        title="Filters"
        className={`rounded-md border p-1.5 text-sm transition-colors ${
          open
            ? "border-black/8 bg-black/5 dark:border-white/25 dark:hover:border-white/50 dark:bg-white/5"
            : "border-black/8 hover:bg-black/5 dark:border-white/25 dark:hover:border-white/50 dark:hover:bg-white/5"
        }`}
      >
        <MdTune className="h-4.5 w-4.5" />
      </button>

      {open && (
        // z-20, not z-10: the game list's sticky "Week N" headers use z-10
        // too, and since they come later in the DOM (inside GameList, below
        // this control row) they'd otherwise win the tie and paint over this
        // popover once the list scrolls under it.
        <div className="absolute top-full left-0 z-20 mt-1 flex flex-col gap-2 rounded-md border-2 border-black/8 bg-background p-2 shadow-lg dark:border-white/50">
          {children}
        </div>
      )}
    </div>
  );
}
