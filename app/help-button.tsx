"use client";

import { useState } from "react";
import { Modal } from "@/app/modal";

const GITHUB_REPO_URL = "https://github.com/GriceTurrble/football-picks";

const LINK_CLASS =
  "font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400";

// Header control explaining what the site is and how to use it, plus links
// back to the source repo. Sits next to Refresh so the two "about the data"
// controls stay together.
export function HelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Help"
        title="Help"
        className="flex h-6.5 w-6.5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        ?
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="About Football Picks"
        widthClassName="max-w-xl"
        footer={
          <>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer rounded-md border border-black/8 px-3 py-1.5 text-sm transition-colors hover:bg-black/5 dark:border-white/25 dark:hover:bg-white/5"
            >
              View on GitHub
            </a>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer rounded-md border border-black/8 px-3 py-1.5 text-sm transition-colors hover:bg-black/5 dark:border-white/25 dark:hover:bg-white/5"
            >
              Close
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4 text-sm">
          <p>
            A personal NFL pick &apos;em tracker: pick the winner of every game
            each week, optionally add a score-total tiebreaker, and keep the
            whole season in one place.
          </p>

          <section className="flex flex-col gap-1.5">
            <h3 className="font-semibold">Making picks</h3>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-zinc-700 dark:text-zinc-300">
              <li>
                The page opens on the current week. Use the week selector to
                change weeks, or choose &quot;All&quot; for the whole season.
              </li>
              <li>
                Click a team in a game to pick them to win. Add a score total
                under the game for the tiebreaker.
              </li>
              <li>
                Picks lock at kickoff. Turn the <strong>Override locks</strong>{" "}
                switch on to change a pick on a game that has already started
                (honor system, no one&apos;s looking).
              </li>
              <li>
                <strong>Compile</strong> turns the week&apos;s picks into a
                plain-text list you can copy and paste elsewhere.
              </li>
              <li>
                <strong>Filters</strong> narrows the list by team, game status,
                or game day. The <strong>Data</strong> button (floppy disk)
                exports, imports, or clears stored picks.
              </li>
              <li>
                <strong>Odds</strong> on each game shows spreads, moneylines,
                and totals. <strong>Refresh</strong> re-fetches the schedule and
                odds; while games are in progress it also runs automatically
                every 5 minutes.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-1.5">
            <h3 className="font-semibold">Where your data lives</h3>
            <p className="text-zinc-700 dark:text-zinc-300">
              Your picks are saved in this browser&apos;s localStorage only -
              there is no account and no server storing them. The schedule,
              scores, and odds are fetched live from ESPN&apos;s public API.
              Clearing this site&apos;s browser data erases your picks, so use{" "}
              <strong>Data &rarr; Export</strong> if you want a backup or want
              to move them to another device.
            </p>
          </section>

          <section className="flex flex-col gap-1.5">
            <h3 className="font-semibold">Source code</h3>
            <p className="text-zinc-700 dark:text-zinc-300">
              This is a hobby project. The code, release history, and issue
              tracker are on GitHub:
            </p>
            <ul className="flex flex-col gap-1">
              <li>
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={LINK_CLASS}
                >
                  github.com/GriceTurrble/football-picks
                </a>
              </li>
              <li>
                <a
                  href={`${GITHUB_REPO_URL}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={LINK_CLASS}
                >
                  Report an issue or suggest a feature
                </a>
              </li>
            </ul>
          </section>
        </div>
      </Modal>
    </>
  );
}
