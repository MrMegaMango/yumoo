"use client";

import { useMemo } from "react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { useDiary } from "@/components/diary-provider";
import { cx } from "@/components/ui";
import { getYearMonthKey } from "@/lib/date";
import { deckledCover } from "@/components/scrapbook-primitives";
import type { MealEntry } from "@/lib/types";

/* ── Scrapbook-style monthly page covers ── */

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const coverRotations = [-1.5, 1, -0.6, 1.2, -1, 0.7, -1.3, 0.5, -0.8, 1.4, -0.5, 0.9];

const coverTapeColors = [
  "bg-[#FFD4B8]/50", "bg-[#F5C0D0]/50", "bg-[#C8E0C8]/50", "bg-[#FFE8A3]/50",
  "bg-[#B8D8E8]/50", "bg-[#E8D0E8]/50", "bg-[#D4E8D0]/50", "bg-[#FFD8A0]/50",
  "bg-[#D0C0E8]/50", "bg-[#FFD0C0]/50", "bg-[#C0D8D0]/50", "bg-[#E8DCC0]/50",
];

function MonthAlbum({
  monthIndex,
  year,
  entries,
}: {
  monthIndex: number;
  year: number;
  entries: MealEntry[];
}) {
  const ym = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const count = entries.length;
  const hasEntries = count > 0;
  const rot = coverRotations[monthIndex];
  const tapeColor = coverTapeColors[monthIndex];

  return (
    <Link href={`/recap/${ym}`} className="group block">
      <div
        className="relative transition-transform duration-200 group-hover:scale-[1.04] group-hover:z-10"
        style={{ rotate: `${rot}deg` }}
      >
        {/* Stacked pages underneath */}
        <div
          className="absolute -bottom-1 left-1 right-0 top-1 rounded-l-[8px]"
          style={{ background: "#F0E0CC", clipPath: deckledCover, opacity: 0.5 }}
        />
        <div
          className="absolute -bottom-[5px] left-2 right-1 top-2 rounded-l-[8px]"
          style={{ background: "#E8D4BC", clipPath: deckledCover, opacity: 0.35 }}
        />

        {/* Main page */}
        <div
          className="relative overflow-hidden rounded-l-[8px] border-l-4 border-l-[#C4A882]"
          style={{
            background: "linear-gradient(170deg, #FFF9F0 0%, #FFF3E4 40%, #FFEDD8 100%)",
            clipPath: deckledCover,
            boxShadow: "3px 3px 16px rgba(107,88,78,0.15)",
          }}
        >
          {/* Paper grain */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />

          {/* Binding stitch dots */}
          <div className="absolute bottom-3 left-[3px] top-3 flex flex-col justify-between">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-[3px] w-[3px] rounded-full bg-[#C4A882]/25" />
            ))}
          </div>

          {/* Washi tape top */}
          <div
            className={`pointer-events-none absolute -left-1 top-2 z-10 h-[14px] w-14 rounded-[2px] ${tapeColor}`}
            style={{ rotate: "-8deg" }}
          />
          <div
            className={`pointer-events-none absolute -right-1 top-4 z-10 h-[14px] w-10 rounded-[2px] ${tapeColor}`}
            style={{ rotate: "10deg" }}
          />

          <div className="relative px-3 pb-3 pl-5 pt-5">
            {/* Cover art: photo collage or fallback */}
            <div className="relative mx-auto mb-2 overflow-hidden rounded-[12px] border border-[#EAD6C7]/30 bg-white/40">
              {hasEntries ? (
                <div className={cx(
                  "grid aspect-square w-full gap-[2px] p-1",
                  count === 1 ? "grid-cols-1" : count <= 4 ? "grid-cols-2" : "grid-cols-3"
                )}>
                  {entries.slice(0, count <= 4 ? 4 : 9).map((entry) => (
                    <div key={entry.id} className="overflow-hidden rounded-[4px]">
                      <img
                        src={entry.art.status === "ready" && entry.art.imageDataUrl ? entry.art.imageDataUrl : entry.photoDataUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <img
                  src="/dogavacado.png"
                  alt=""
                  className="aspect-square w-full object-contain p-1"
                  style={{ filter: "saturate(0.4) opacity(0.5)" }}
                />
              )}
            </div>

            {/* Scattered mini stars */}
            <span className="pointer-events-none absolute right-3 top-8 text-[8px] text-yellow-400/40" style={{ rotate: "15deg" }}>✦</span>
            <span className="pointer-events-none absolute left-8 top-12 text-[6px] text-yellow-400/30" style={{ rotate: "-20deg" }}>✦</span>

            {/* Month label */}
            <p className="text-center text-[13px] font-bold text-ink/70">
              {monthNames[monthIndex]} Pages
            </p>
            <p className="mt-0.5 text-center text-[10px] font-medium text-cocoa/40">
              {hasEntries ? `${count} ${count === 1 ? "Entry" : "Entries"}` : "no entries yet"}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── Group entries by month ── */

function groupByMonth(entries: MealEntry[]) {
  const map = new Map<string, MealEntry[]>();
  for (const entry of entries) {
    const ym = getYearMonthKey(entry.localDate);
    if (!map.has(ym)) map.set(ym, []);
    map.get(ym)!.push(entry);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([yearMonth, monthEntries]) => ({ yearMonth, entries: monthEntries }));
}

/* ── Page ── */

export default function StacksPage() {
  const { entries, ready } = useDiary();

  const months = useMemo(() => groupByMonth(entries), [entries]);

  return (
    <AppShell
      title="Monthly Stacks"
      subtitle="Your year in meals, month by month."
      showInstallBanner={false}
      headerTrailing={
        <div className="relative" style={{ rotate: "8deg" }}>
          <span className="absolute -left-3 -top-3 z-10 text-lg text-cocoa/30" style={{ rotate: "-15deg" }}>📎</span>
          <div
            className="rounded-[8px] border border-[#D4BCA8]/50 px-3 py-1.5"
            style={{
              background: "linear-gradient(135deg, #F5E6D0, #EDD8C0)",
              boxShadow: "1px 2px 6px rgba(107,88,78,0.1)",
            }}
          >
            <div className="pointer-events-none absolute inset-[3px] rounded-[6px] border border-dashed border-[#C4A882]/30" />
            <p className="relative font-display text-[11px] lowercase italic tracking-[0.12em] text-ink/70">
              {ready ? `${entries.length} meals` : "..."}
            </p>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-5 px-1">
        {Array.from({ length: 12 }, (_, i) => {
          const year = new Date().getFullYear();
          const ym = `${year}-${String(i + 1).padStart(2, "0")}`;
          const monthEntries = months.find((m) => m.yearMonth === ym)?.entries ?? [];
          return (
            <MonthAlbum
              key={i}
              monthIndex={i}
              year={year}
              entries={monthEntries}
            />
          );
        })}
      </div>
    </AppShell>
  );
}
