"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

interface ModalStackContextValue {
  /** Ids of every currently-open modal, in the order they opened - last is topmost. */
  stack: string[];
  /** Registers `id` as open, at the top of the stack. No-op if already present. */
  open: (id: string) => void;
  /** Removes `id` from the stack, wherever it sits - closing a modal only ever affects its own entry. */
  close: (id: string) => void;
}

const ModalStackContext = createContext<ModalStackContextValue | null>(null);

// Tracks every currently-open Modal (see app/modal.tsx) as an explicit stack,
// rather than relying on the browser's own bookkeeping for nested/stacked
// native <dialog> elements - which is what this replaces. Opening the odds
// modal (app/odds-button.tsx) from a GameListItem embedded inside the
// Compiled Picks modal (app/compile-button.tsx) is exactly the "modal on top
// of a modal" case this exists for: each Modal instance pushes its own id
// when it opens and pops only that same id when it closes, so closing the
// top one can never affect the one(s) underneath - regardless of how many
// are nested.
export function ModalStackProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [stack, setStack] = useState<string[]>([]);

  const open = useCallback((id: string) => {
    setStack((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const close = useCallback((id: string) => {
    setStack((prev) => prev.filter((entry) => entry !== id));
  }, []);

  const value = useMemo(() => ({ stack, open, close }), [stack, open, close]);

  return (
    <ModalStackContext.Provider value={value}>
      {children}
    </ModalStackContext.Provider>
  );
}

export function useModalStack(): ModalStackContextValue {
  const ctx = useContext(ModalStackContext);
  if (!ctx) {
    throw new Error("useModalStack must be used within a ModalStackProvider");
  }
  return ctx;
}
