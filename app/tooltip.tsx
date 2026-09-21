import { useRef, useState } from "react";

export function ToolTipLabel({
  label,
  tip,
  className,
}: {
  label: string;
  tip: string;
  className?: string;
}) {
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  function show(event: React.MouseEvent<HTMLSpanElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
    tooltipRef.current?.showPopover();
    timeoutRef.current = setTimeout(() => setVisible(true), 250);
  }

  function hide() {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setVisible(false);
    tooltipRef.current?.hidePopover();
  }

  return (
    <span
      className={`cursor-help border-b border-dotted border-zinc-400 dark:border-zinc-600 ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {label}
      <span
        ref={tooltipRef}
        popover="manual"
        role="tooltip"
        style={{ left: pos.x, top: pos.y, transform: "translateX(-50%)" }}
        className={`pointer-events-none m-0 inset-auto w-max max-w-64 rounded-md border border-black/8 bg-background px-2 py-1.5 text-xs font-normal text-foreground shadow-lg transition-opacity duration-150 ease-in-out dark:border-white/[.145] ${visible ? "opacity-100" : "opacity-0"}`}
      >
        <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-t border-l border-black/8 bg-background dark:border-white/[.145]" />
        {tip}
      </span>
    </span>
  );
}
