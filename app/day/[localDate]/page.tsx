"use client";

import { use } from "react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { ArtTile } from "@/components/art-tile";
import { useDiary } from "@/components/diary-provider";
import { Card, Tag, buttonClasses } from "@/components/ui";
import { formatFullDate, formatTimeLabel } from "@/lib/date";
import { getEntriesForDay } from "@/lib/diary";

export default function DayPage({
  params
}: {
  params: Promise<{ localDate: string }>;
}) {
  const resolvedParams = use(params);
  const localDate = decodeURIComponent(resolvedParams.localDate);
  const { entries, ready } = useDiary();
  const dayEntries = getEntriesForDay(entries, localDate);

  return (
    <AppShell
      title={formatFullDate(localDate)}
      subtitle="Original photo plus cute art placeholder, all in one day stack."
    >
      <div className="flex items-center justify-between">
        <Tag active>{ready ? `${dayEntries.length} entries` : "Loading"}</Tag>
        <Link href={`/entry/new?date=${localDate}`} className={buttonClasses("secondary")}>
          Add to this day
        </Link>
      </div>

      {ready && dayEntries.length === 0 ? (
        <Card className="space-y-4">
          <h2 className="text-2xl font-semibold text-ink">No meals here yet.</h2>
          <p className="text-sm leading-6 text-cocoa">
            This date is open space. Add something small and let the calendar start collecting.
          </p>
          <Link href={`/entry/new?date=${localDate}`} className={buttonClasses("primary", "w-full")}>
            Log a meal
          </Link>
        </Card>
      ) : null}

      <div className="space-y-4">
        {dayEntries.map((entry) => (
          <Link key={entry.id} href={`/entry/${entry.id}`} className="block">
            <Card className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cocoa/70">
                    {formatTimeLabel(entry.takenAt)}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-ink">
                    {entry.mood ? `${entry.mood} Meal` : entry.caption || "Meal"}
                  </h2>
                </div>
                {entry.mealType ? <Tag>{entry.mealType}</Tag> : null}
              </div>
              <ArtTile entry={entry} size="md" showCaption />
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
