"use client";

import { useState, useTransition } from "react";
import { MdBarChart, MdRefresh } from "react-icons/md";
import type {
  Game,
  Odds,
  OddsSideSnapshot,
  OddsTotalSnapshot,
  PickSelection,
} from "@/lib/types";
import { Modal } from "@/app/modal";
import { GameListItem } from "@/app/game-list-item";
import { ToolTipLabel } from "@/app/tooltip";
import { refreshOdds } from "@/lib/odds-actions";
import { formatRefreshedAt } from "@/lib/format";

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
  game,
  odds,
  pick,
  scoreTotal,
  lockOverride,
}: {
  game: Game;
  /** Undefined (not fetched into props) and null (fetched, nothing in the DB) both render as placeholders. */
  odds?: Odds | null;
  pick?: PickSelection;
  scoreTotal?: number;
  lockOverride?: boolean;
}) {
  const { awayTeamName, homeTeamName } = game;
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(async () => {
      await refreshOdds(game.id);
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
          {/* Lets a winner/score-total be picked without leaving the modal.
              showOddsButton=false, since this copy of the game is already
              inside its own odds modal - showing the trigger again here
              would just open another one on top of itself. */}
          <ul className="flex flex-col gap-2">
            <GameListItem
              game={game}
              pick={pick}
              scoreTotal={scoreTotal}
              odds={odds}
              lockOverride={lockOverride}
              showOddsButton={false}
            />
          </ul>

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
                    <ToolTipLabel
                      label="Open"
                      tip="The line when this sportsbook first posted odds for the game."
                    />
                  </th>
                  <th className="py-1 text-right font-medium">
                    <ToolTipLabel
                      label="Current"
                      tip="The most recently fetched line."
                    />
                  </th>
                  {hasClose && (
                    <th className="py-1 text-right font-medium">
                      <ToolTipLabel
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
                    <ToolTipLabel
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
                    <ToolTipLabel
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
                    <ToolTipLabel
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
                    <ToolTipLabel
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
                    <ToolTipLabel
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
            <ToolTipLabel
              label={`Moneyline result: ${formatFlag(odds?.moneylineWinner)}`}
              tip="ESPN's own settlement flag for the moneyline bet. ESPN doesn't publicly document its exact definition, and it's been observed reading 'No' even when the favorite won outright - treat it as a raw data point, not a reliable verdict."
            />
            <ToolTipLabel
              label={`Spread result: ${formatFlag(odds?.spreadWinner)}`}
              tip="ESPN's own settlement flag for the spread bet. Same caveat as the moneyline result above."
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
