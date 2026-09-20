"use client";

import { useRef, useState, useTransition } from "react";
import { MdBarChart, MdRefresh } from "react-icons/md";
import type { Odds, OddsSideSnapshot, OddsTotalSnapshot } from "@/lib/types";
import { Modal } from "@/app/modal";
import { refreshOdds } from "@/lib/odds-actions";
import { formatRefreshedAt } from "@/lib/format";

// Hover-tooltip for a stat label. The browser's native `title` attribute is
// unreliable here - timing is entirely up to the browser (often a second-plus
// delay, and some browsers won't re-show one for a while right after it's
// dismissed) - so this drives visibility with plain React state instead,
// which shows/hides the instant the mouse enters/leaves.
//
// Shown via the Popover API (the `popover` attribute + show/hidePopover())
// rather than plain CSS positioning, because a plain `position: fixed`
// tooltip here runs into a wall: Modal's <dialog> animates open/closed via a
// `scale` transform, and any element with a non-`none` transform/scale
// becomes the containing block for its `position: fixed` descendants (per
// the CSS containing-block spec) - so the tooltip's containing block ends up
// being the dialog itself, not the viewport. Since that same dialog also has
// `overflow: auto` (see Modal's own comment on it), any part of the tooltip
// that would extend past the dialog's edge gets clipped by it - no z-index
// fixes that, since it's overflow clipping, not a stacking-order contest.
// The Popover API sidesteps this the same way <dialog> itself does: showing
// it promotes the tooltip into the browser's top layer, which isn't subject
// to any ancestor's overflow clipping at all, and - since it's shown after
// the already-open dialog - naturally paints above it.
//
// Shows immediately but transparent, then fades in via CSS transition once
// hovered for 250ms - rather than delaying the show itself - to dodge a
// render-order race: `showPopover()` takes effect the instant it's called,
// but the `left`/`top` from a fresh `setPos()` only reach the DOM once React
// commits that state update, so a tooltip made visible in the same tick it's
// positioned can flash at its old (or default top-left) position for a
// frame first. Starting at opacity-0 means that stale-position frame is
// invisible regardless of exactly when React's commit lands, and the reveal
// only fires once React has had 250ms - far longer than any single commit
// takes - to catch up. The timeout is stashed in a ref so a mouseleave
// before it fires cancels the reveal outright, leaving the tooltip unseen.
function Stat({ label, tip }: { label: string; tip: string }) {
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
      className="cursor-help border-b border-dotted border-zinc-400 dark:border-zinc-600"
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

function formatFlag(value: boolean | null | undefined): string {
  return value === null || value === undefined ? "—" : value ? "Yes" : "No";
}

// A side's spread line at one point in time, e.g. "-3 (-120)" - the point
// spread itself, plus the price to bet it, when both are available.
function sideLine(snapshot?: OddsSideSnapshot): string {
  if (!snapshot?.pointSpread) return "—";
  const price = snapshot.spread ? ` (${snapshot.spread.american})` : "";
  return `${snapshot.pointSpread.american}${price}`;
}

function sideMoneyline(snapshot?: OddsSideSnapshot): string {
  return snapshot?.moneyLine?.american ?? "—";
}

// The over/under line at one point in time, e.g. "44.5 (O-108/U-112)".
function totalLine(snapshot?: OddsTotalSnapshot): string {
  if (!snapshot?.total) return "—";
  const over = snapshot.over ? ` (O${snapshot.over.american}` : "";
  const under = snapshot.under
    ? `/U${snapshot.under.american})`
    : over
      ? ")"
      : "";
  return `${snapshot.total.american}${over}${under}`;
}

const rowClassName = "border-t border-black/8 dark:border-white/10";
const cellClassName = "py-1 text-right";

export function OddsButton({
  gameId,
  odds,
  awayTeamName,
  homeTeamName,
}: {
  gameId: string;
  /** Undefined (not fetched into props) and null (fetched, nothing in the DB) both render as placeholders. */
  odds?: Odds | null;
  awayTeamName: string;
  homeTeamName: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(async () => {
      await refreshOdds(gameId);
    });
  }

  // A "close" line only exists once the book has stopped taking bets -
  // showing the column at all only makes sense once at least one stat has
  // one.
  const hasClose = Boolean(
    odds?.away.detail.close || odds?.home.detail.close || odds?.total.close,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="View betting odds"
        className="flex cursor-pointer items-center gap-1 rounded-full border border-black/8 px-2 py-0.5 text-[0.65rem] font-medium text-zinc-500 transition-colors hover:bg-black/5 dark:border-white/[.145] dark:text-zinc-400 dark:hover:bg-white/5"
      >
        <MdBarChart /> Odds
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`${awayTeamName} @ ${homeTeamName} Odds`}
        widthClassName="max-w-xl"
        footer={
          <>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isPending}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-black/8 px-3 py-1 text-sm font-medium text-zinc-700 disabled:opacity-60 dark:border-white/[.145] dark:text-zinc-200"
            >
              <MdRefresh className={isPending ? "animate-spin" : undefined} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer rounded-md border border-black/8 px-3 py-1.5 text-sm transition-colors hover:bg-black/5 dark:border-white/[.145] dark:hover:bg-white/5"
            >
              Close
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>{odds?.providerName ?? "No odds fetched yet"}</span>
            <span>
              {odds ? `Fetched ${formatRefreshedAt(odds.fetchedAt)}` : "—"}
            </span>
          </div>

          {odds?.details && (
            <div className="text-center font-mono text-lg font-bold">
              {odds.details}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-104 border-collapse text-xs">
              <thead>
                <tr className="text-zinc-500 dark:text-zinc-400">
                  <th className="py-1 text-left font-medium">Line</th>
                  <th className="py-1 text-right font-medium">
                    <Stat
                      label="Open"
                      tip="The line when this sportsbook first posted odds for the game."
                    />
                  </th>
                  <th className="py-1 text-right font-medium">
                    <Stat
                      label="Current"
                      tip="The most recently fetched line."
                    />
                  </th>
                  {hasClose && (
                    <th className="py-1 text-right font-medium">
                      <Stat
                        label="Close"
                        tip="The final line right before kickoff, once the book stops taking bets."
                      />
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="font-mono">
                <tr className={rowClassName}>
                  <td className="py-1">
                    <Stat
                      label={`${awayTeamName} spread${odds?.away.favorite ? " (fav)" : ""}`}
                      tip="The margin this team must beat (if favored) or can lose by (if the underdog) for a spread bet on them to win. The number in parentheses is the price to place that bet, in American odds."
                    />
                  </td>
                  <td className={cellClassName}>
                    {sideLine(odds?.away.detail.open)}
                  </td>
                  <td className={cellClassName}>
                    {sideLine(odds?.away.detail.current)}
                  </td>
                  {hasClose && (
                    <td className={cellClassName}>
                      {sideLine(odds?.away.detail.close)}
                    </td>
                  )}
                </tr>
                <tr className={rowClassName}>
                  <td className="py-1">
                    <Stat
                      label={`${homeTeamName} spread${odds?.home.favorite ? " (fav)" : ""}`}
                      tip="The margin this team must beat (if favored) or can lose by (if the underdog) for a spread bet on them to win. The number in parentheses is the price to place that bet, in American odds."
                    />
                  </td>
                  <td className={cellClassName}>
                    {sideLine(odds?.home.detail.open)}
                  </td>
                  <td className={cellClassName}>
                    {sideLine(odds?.home.detail.current)}
                  </td>
                  {hasClose && (
                    <td className={cellClassName}>
                      {sideLine(odds?.home.detail.close)}
                    </td>
                  )}
                </tr>
                <tr className={rowClassName}>
                  <td className="py-1">
                    <Stat
                      label={`${awayTeamName} moneyline`}
                      tip="A bet on this team to win outright, regardless of margin. American odds: a negative price is what you'd wager to win $100; a positive price is what a $100 wager would win."
                    />
                  </td>
                  <td className={cellClassName}>
                    {sideMoneyline(odds?.away.detail.open)}
                  </td>
                  <td className={cellClassName}>
                    {sideMoneyline(odds?.away.detail.current)}
                  </td>
                  {hasClose && (
                    <td className={cellClassName}>
                      {sideMoneyline(odds?.away.detail.close)}
                    </td>
                  )}
                </tr>
                <tr className={rowClassName}>
                  <td className="py-1">
                    <Stat
                      label={`${homeTeamName} moneyline`}
                      tip="A bet on this team to win outright, regardless of margin. American odds: a negative price is what you'd wager to win $100; a positive price is what a $100 wager would win."
                    />
                  </td>
                  <td className={cellClassName}>
                    {sideMoneyline(odds?.home.detail.open)}
                  </td>
                  <td className={cellClassName}>
                    {sideMoneyline(odds?.home.detail.current)}
                  </td>
                  {hasClose && (
                    <td className={cellClassName}>
                      {sideMoneyline(odds?.home.detail.close)}
                    </td>
                  )}
                </tr>
                <tr className={rowClassName}>
                  <td className="py-1">
                    <Stat
                      label="Total (O/U)"
                      tip="A bet on whether the two teams' combined final score lands over or under this number. The O/U prices in parentheses are what each side of that bet costs, in American odds."
                    />
                  </td>
                  <td className={cellClassName}>
                    {totalLine(odds?.total.open)}
                  </td>
                  <td className={cellClassName}>
                    {totalLine(odds?.total.current)}
                  </td>
                  {hasClose && (
                    <td className={cellClassName}>
                      {totalLine(odds?.total.close)}
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <Stat
              label={`Moneyline result: ${formatFlag(odds?.moneylineWinner)}`}
              tip="ESPN's own settlement flag for the moneyline bet. ESPN doesn't publicly document its exact definition, and it's been observed reading 'No' even when the favorite won outright - treat it as a raw data point, not a reliable verdict."
            />
            <Stat
              label={`Spread result: ${formatFlag(odds?.spreadWinner)}`}
              tip="ESPN's own settlement flag for the spread bet. Same caveat as the moneyline result above."
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
