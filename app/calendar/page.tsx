"use client";

import { useState } from "react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { CalendarGrid } from "@/components/calendar-grid";
import { useDiary } from "@/components/diary-provider";
import { Button, Card, Tag, buttonClasses } from "@/components/ui";
import {
  addMonths,
  formatMonthLabel,
  getYearMonthKey
} from "@/lib/date";
import {
  getCurrentStreak,
  getDaysLoggedCount,
  getEntriesForYearMonth
} from "@/lib/diary";

export default function CalendarPage() {
  const { entries, ready } = useDiary();
  const [viewMonth, setViewMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );

  const yearMonth = getYearMonthKey(viewMonth);
  const monthEntries = getEntriesForYearMonth(entries, yearMonth);
  const daysLogged = getDaysLoggedCount(monthEntries);
  const streak = getCurrentStreak(entries);

  return (
    <AppShell
      title="Your meal story"
      subtitle="The month should feel more satisfying every time you log a meal."
      headerTrailing={<Tag active>{ready ? `${entries.length} meals` : "Loading"}</Tag>}
    >
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-cocoa">This month</p>
            <h2 className="mt-1 text-2xl font-semibold text-ink">{formatMonthLabel(viewMonth)}</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setViewMonth((current) => addMonths(current, -1))}>
              Prev
            </Button>
            <Button variant="secondary" onClick={() => setViewMonth((current) => addMonths(current, 1))}>
              Next
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[24px] bg-cream p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cocoa/70">
              Days logged
            </p>
            <p className="mt-2 text-3xl font-semibold text-ink">{daysLogged}</p>
          </div>
          <div className="rounded-[24px] bg-cream p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cocoa/70">
              Current streak
            </p>
            <p className="mt-2 text-3xl font-semibold text-ink">{streak}</p>
          </div>
        </div>
      </Card>

      {ready && entries.length === 0 ? (
        <Card className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-ink">Start with one soft little square.</h2>
            <p className="mt-2 text-sm leading-6 text-cocoa">
              The first meal matters most because it turns the empty month into a diary.
            </p>
          </div>
          <Link href="/entry/new" className={buttonClasses("primary", "w-full")}>
            Log your first meal
          </Link>
        </Card>
      ) : null}

      <CalendarGrid viewMonth={viewMonth} entries={monthEntries} />

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-ink">Monthly recap</h2>
            <p className="mt-1 text-sm leading-6 text-cocoa">
              The share artifact matters more than charts.
            </p>
          </div>
          <Link href={`/recap/${yearMonth}`} className={buttonClasses("secondary")}>
            Open recap
          </Link>
        </div>
        <div className="rounded-[24px] bg-cream p-4 text-sm leading-6 text-cocoa">
          Entries save immediately, then the cute-art tile upgrades itself in the background. If the
          art layer fails, the diary still looks good.
        </div>
      </Card>
    </AppShell>
  );
}

