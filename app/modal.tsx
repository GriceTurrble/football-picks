"use client";

import { useEffect, useId, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useModalStack } from "@/app/modal-stack";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Rendered as a row along the bottom, spaced apart (e.g. two buttons). */
  footer?: React.ReactNode;
  /** Tailwind max-width utility for the panel. Defaults to a compact size. */
  widthClassName?: string;
}

// Portals can't render during SSR - document doesn't exist in Node, and
// createPortal needs a real DOM node as its target - so Modal has to know
// whether it's on the client yet. useSyncExternalStore's server/client
// snapshot split is the standard way to get that without an explicit
// setState inside an effect (which would trip the
// react-hooks/set-state-in-effect lint rule for no real benefit here): it
// returns `false` for the server render and the first client render (so
// they match, no hydration mismatch), then React reruns it once more right
// after hydration, when it returns `true`.
function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

// Generic modal dialog. Built on plain positioned <div>s, deliberately not
// the native <dialog> element - this used to use <dialog>/showModal(), but
// nesting one open modal dialog inside another's rendered content (e.g. the
// odds modal opened from a GameListItem embedded inside the Compiled Picks
// modal - see app/odds-button.tsx) hit inconsistent browser bookkeeping for
// "which dialog is topmost": closing the inner one was also closing the
// outer one. Native <dialog> stacking just isn't reliable for this "modal
// opened from inside another modal" shape, so this manages its own stack
// instead (see app/modal-stack.tsx) - each Modal instance pushes its own id
// when it opens and pops only that id when it closes or unmounts, so closing
// one can never affect any other, regardless of nesting depth.
//
// Rendered through a portal straight to document.body, rather than inline
// wherever the component is used, both so its fixed positioning isn't
// affected by any ancestor and so a stacked modal always ends up a DOM
// sibling of the one that opened it, not nested inside it.
//
// Controlled by `open` - the caller owns whether it's shown, this just syncs
// that to the stack and the DOM - and reports back through `onClose`, which
// fires on Escape (only when this modal is the topmost - see useModalStack)
// or a click on the backdrop itself.
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  widthClassName = "max-w-lg",
}: ModalProps) {
  const id = useId();
  const isClient = useIsClient();
  const { stack, open: pushOpen, close: popOpen } = useModalStack();

  useEffect(() => {
    if (!open) return;
    pushOpen(id);
    return () => popOpen(id);
  }, [open, id, pushOpen, popOpen]);

  const stackIndex = stack.indexOf(id);
  const isTop = stackIndex === stack.length - 1;

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isTop) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, isTop, onClose]);

  if (!isClient) return null;

  const titleId = title ? `${id}-title` : undefined;
  // Stack position - not DOM/mount order, which is fixed at initial render
  // for every GameListItem's odds modal regardless of when each one is
  // actually opened - drives z-index, so whichever modal opened most
  // recently always paints above the others.
  const zIndex = 100 + Math.max(stackIndex, 0) * 2;

  return createPortal(
    <div
      role="presentation"
      data-open={open || undefined}
      style={{ zIndex }}
      // The whole overlay (backdrop dimming + panel) fades in/out together
      // as one unit; the panel additionally scales on its own below. Both
      // properties this transitions - opacity and display - need
      // transition-discrete (allow-discrete) so the display:none <-> flex
      // swap waits for the fade to finish instead of snapping instantly,
      // with @starting-style (the starting: variant) supplying the frame to
      // animate in from the moment it stops being display:none.
      className="fixed inset-0 hidden items-start justify-center overflow-y-auto bg-black/40 opacity-0 transition-all duration-300 ease-in-out transition-discrete data-open:flex data-open:opacity-100 starting:data-open:opacity-0 dark:bg-black/60"
      onClick={(event) => {
        // A click that lands on this overlay itself (rather than the panel
        // below) is a click on the backdrop.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-open={open || undefined}
        className={`mx-auto my-8 w-full ${widthClassName} scale-95 rounded-lg border border-black/8 bg-background p-0 text-foreground transition-transform duration-300 ease-in-out data-open:scale-100 dark:border-white/[.145]`}
      >
        <div className="flex flex-col gap-3 p-4">
          {title && (
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
          )}
          {children}
          {footer && (
            <div className="flex items-center justify-between gap-2">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
