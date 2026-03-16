"use client";

import { use, useTransition } from "react";

import { AppShell } from "@/components/app-shell";
import { useDiary } from "@/components/diary-provider";
import { RecapPoster } from "@/components/recap-poster";
import { Button, Card, Tag } from "@/components/ui";
import { getCurrentStreak, getDaysLoggedCount, getEntriesForYearMonth } from "@/lib/diary";
import { buildRecapSvg, downloadRecapSvg, getTopMealType } from "@/lib/recap";

export default function RecapPage({
  params
}: {
  params: Promise<{ yearMonth: string }>;
}) {
  const resolvedParams = use(params);
  const yearMonth = decodeURIComponent(resolvedParams.yearMonth);
  const { entries } = useDiary();
  const monthEntries = getEntriesForYearMonth(entries, yearMonth);
  const daysLogged = getDaysLoggedCount(monthEntries);
  const currentStreak = getCurrentStreak(entries);
  const [isExporting, startTransition] = useTransition();

  function handleExport() {
    startTransition(() => {
      const svg = buildRecapSvg({
        yearMonth,
        entries: monthEntries,
        metrics: {
          totalMeals: monthEntries.length,
          daysLogged,
          currentStreak,
          topMealType: getTopMealType(monthEntries)
        }
      });

      downloadRecapSvg(svg, `yumoo-${yearMonth}-recap.svg`);
    });
  }

  return (
    <AppShell
      title="Monthly recap"
      subtitle="A scrapbook-style artifact that gets nicer as the month fills up."
    >
      <div className="flex items-center justify-between">
        <Tag active>{monthEntries.length} meals in view</Tag>
        <Button variant="secondary" onClick={handleExport} disabled={!monthEntries.length || isExporting}>
          {isExporting ? "Preparing..." : "Download SVG"}
        </Button>
      </div>

      <RecapPoster
        yearMonth={yearMonth}
        entries={monthEntries}
        daysLogged={daysLogged}
        currentStreak={currentStreak}
      />

      <Card className="space-y-3">
        <h2 className="text-xl font-semibold text-ink">Recap notes</h2>
        <p className="text-sm leading-6 text-cocoa">
          The current export is an SVG poster built locally from your saved entries. It is quick,
          private, and good enough for an MVP share artifact while a richer export pipeline is still
          pending.
        </p>
      </Card>
    </AppShell>
  );
}
