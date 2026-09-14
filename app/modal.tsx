"use client";

import { useEffect, useRef } from "react";

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

// Generic modal dialog, built on the native <dialog> element for free
// Escape-to-close, backdrop dimming, and top-layer stacking. Controlled by
// `open` - the caller owns whether it's shown, this just syncs that to the
// DOM - and reports back through `onClose`, which fires from the dialog's
// native "close" event no matter how it was triggered (Escape, a backdrop
// click, or the caller's own close button).
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  widthClassName = "max-w-lg",
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        // A click that lands on the <dialog> element itself (rather than
        // something inside the panel below) is a click on the backdrop.
        if (event.target === ref.current) ref.current?.close();
      }}
      // The browser centers an open <dialog> via its own UA-stylesheet
      // margin: auto, but Tailwind's preflight resets every element's
      // margin to 0 - m-auto here just puts that centering back.
      //
      // The fade/scale-in on open needs `display` itself in the transition
      // (via transition-discrete, i.e. transition-behavior: allow-discrete)
      // - otherwise the browser has no previous frame to animate from, since
      // the dialog was `display: none` a moment ago. starting:open:* supplies
      // that previous frame's values (@starting-style). This also gives the
      // reverse (fade/scale-out on close) for free, holding `display: none`
      // until the transition finishes.
      className={`m-auto w-full ${widthClassName} scale-95 rounded-lg border border-black/8 bg-background p-0 text-foreground opacity-0 transition-all duration-300 ease-in-out transition-discrete open:scale-100 open:opacity-100 starting:open:scale-95 starting:open:opacity-0 backdrop:bg-black/40 dark:border-white/[.145] dark:backdrop:bg-black/60`}
    >
      <div className="flex flex-col gap-3 p-4">
        {title && <h2 className="text-lg font-semibold">{title}</h2>}
        {children}
        {footer && (
          <div className="flex items-center justify-between gap-2">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
