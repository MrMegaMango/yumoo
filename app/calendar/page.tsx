"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { useDiary } from "@/components/diary-provider";
import { Tag, cx } from "@/components/ui";
import { formatMonthLabel, addMonths, getYearMonthKey, toLocalDateString } from "@/lib/date";
import { getEntriesForYearMonth } from "@/lib/diary";
import type { MealEntry } from "@/lib/types";

/* ── Deterministic seed from entry ID ── */

function seed(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/* ── Per-card organic styles ── */

const ratios = ["3/4", "1/1", "4/5", "5/6", "2/3"];
const rotations = [-2.2, 1.4, -0.8, 2, -1.5, 0.6, -1.8, 1.1, 0.3, -1.2];
const topOffsets = [0, 8, 2, 12, 4, 10, 6, 14, 3, 9];
const paddings = [5, 6, 5, 7, 6, 5, 7, 6, 5, 7];

function cardStyle(id: string) {
  const s = seed(id);
  return {
    aspectRatio: ratios[s % ratios.length],
    rotate: `${rotations[s % rotations.length]}deg`,
    marginTop: `${topOffsets[s % topOffsets.length]}px`,
    padding: `${paddings[s % paddings.length]}px`,
  };
}

/* ── Polaroid tile ── */

function PolaroidTile({ entry }: { entry: MealEntry }) {
  const style = cardStyle(entry.id);

  return (
    <Link href={`/entry/${entry.id}`} className="group block">
      <div
        className="mb-4 rounded-[18px] bg-white transition-transform group-hover:scale-[1.03]"
        style={{
          rotate: style.rotate,
          marginTop: style.marginTop,
          padding: style.padding,
          paddingBottom: `${parseInt(style.padding) + 8}px`,
          boxShadow: "0 2px 16px rgba(107,88,78,0.10), 0 0.5px 3px rgba(107,88,78,0.06)",
        }}
      >
        <div className="relative overflow-hidden rounded-[14px]">
          <img
            src={entry.photoDataUrl}
            alt={entry.mood ? `${entry.mood} meal` : "Meal"}
            className="block w-full object-cover"
            style={{ aspectRatio: style.aspectRatio }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <div className="absolute bottom-2.5 left-2.5 right-2.5">
            {entry.mood ? (
              <span className="text-base drop-shadow-sm">{entry.mood}</span>
            ) : null}
            {entry.mealType ? (
              <p className="mt-0.5 truncate text-[11px] font-medium text-white/90 drop-shadow-sm">
                {entry.mealType}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── Empty placeholder ── */

const emptyRotations = [-1.5, 1.8, -0.7, 2.1];
const emptyOffsets = [6, 0, 10, 3];

function EmptySlot({ index }: { index: number }) {
  return (
    <div
      className="mb-4 flex aspect-[4/5] items-center justify-center rounded-[18px] border-2 border-dashed border-[#EAD6C7]/40"
      style={{
        rotate: `${emptyRotations[index % emptyRotations.length]}deg`,
        marginTop: `${emptyOffsets[index % emptyOffsets.length]}px`,
      }}
    >
      <p className="px-4 text-center text-xs text-cocoa/25">waiting for art</p>
    </div>
  );
}

/* ── Dot tracker ── */

function DotTracker({ viewMonth, loggedDates }: { viewMonth: Date; loggedDates: Set<string> }) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <div className="flex items-center justify-center gap-[5px] py-1">
      {Array.from({ length: daysInMonth }, (_, i) => {
        const date = toLocalDateString(new Date(year, month, i + 1));
        const logged = loggedDates.has(date);
        return (
          <div
            key={i}
            className={
              logged
                ? "h-[6px] w-[6px] rounded-full bg-ink/70 transition-all"
                : "h-[6px] w-[6px] rounded-full border border-[#EAD6C7]/60 transition-all"
            }
          />
        );
      })}
    </div>
  );
}

/* ── Filters ── */

const filters = ["all", "🥬 Go Green", "🍰 Sweet Treat", "🏡 Homemade", "🔥 Street Food", "✨ Bougie Bite"] as const;

/* ── Page ── */

export default function GalleryPage() {
  const { entries, ready } = useDiary();
  const [viewMonth, setViewMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const yearMonth = getYearMonthKey(viewMonth);
  const monthEntries = getEntriesForYearMonth(entries, yearMonth);

  const filtered = activeFilter === "all"
    ? monthEntries
    : monthEntries.filter((e) => e.mealType === activeFilter);

  const loggedDates = useMemo(
    () => new Set(monthEntries.map((e) => e.localDate)),
    [monthEntries]
  );

  // Show a few empty placeholders when gallery is sparse
  const placeholderCount = Math.max(0, 4 - filtered.length);

  return (
    <AppShell
      title="Your gallery"
      subtitle="Every meal's a moment. Scroll the vibes."
      headerTrailing={<Tag active>{ready ? `${entries.length} meals` : "..."}</Tag>}
    >
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-ink">{formatMonthLabel(viewMonth)}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMonth((c) => addMonths(c, -1))}
            className="rounded-full bg-white/80 px-3 py-1.5 text-sm font-medium text-cocoa ring-1 ring-[#EAD6C7] transition hover:bg-cream"
          >
            ←
          </button>
          <button
            onClick={() => setViewMonth((c) => addMonths(c, 1))}
            className="rounded-full bg-white/80 px-3 py-1.5 text-sm font-medium text-cocoa ring-1 ring-[#EAD6C7] transition hover:bg-cream"
          >
            →
          </button>
        </div>
      </div>

      {/* Dot tracker */}
      <DotTracker viewMonth={viewMonth} loggedDates={loggedDates} />

      {/* Filter tags */}
      <div className="-mx-4 overflow-x-auto px-4 scrollbar-hide">
        <div className="flex gap-2 pb-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cx(
                "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition",
                activeFilter === f
                  ? "bg-ink text-white shadow-card"
                  : "bg-white/80 text-cocoa ring-1 ring-[#EAD6C7]"
              )}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Scattered gallery */}
      {ready && filtered.length === 0 && entries.length === 0 ? (
        <div className="space-y-4 text-center">
          <div className="flex gap-3 px-2">
            <div className="flex flex-1 flex-col">
              <EmptySlot index={0} />
              <EmptySlot index={2} />
            </div>
            <div className="flex flex-1 flex-col pt-5">
              <EmptySlot index={1} />
              <EmptySlot index={3} />
            </div>
          </div>
          <p className="text-sm text-cocoa">Your gallery is a blank canvas.</p>
        </div>
      ) : ready && filtered.length === 0 ? (
        <div className="flex gap-3 px-2">
          <div className="flex flex-1 flex-col">
            <EmptySlot index={0} />
          </div>
          <div className="flex flex-1 flex-col pt-5">
            <EmptySlot index={1} />
          </div>
        </div>
      ) : (
        <div className="flex gap-2 px-1">
          <div className="flex flex-1 flex-col">
            {filtered.filter((_, i) => i % 2 === 0).map((entry) => (
              <PolaroidTile key={entry.id} entry={entry} />
            ))}
            {placeholderCount >= 2 ? <EmptySlot index={0} /> : null}
          </div>
          <div className="flex flex-1 flex-col pt-6">
            {filtered.filter((_, i) => i % 2 === 1).map((entry) => (
              <PolaroidTile key={entry.id} entry={entry} />
            ))}
            {placeholderCount >= 1 ? <EmptySlot index={1} /> : null}
          </div>
        </div>
      )}

      {/* Recap link */}
      {monthEntries.length > 0 ? (
        <Link
          href={`/recap/${yearMonth}`}
          className="block rounded-[24px] bg-[linear-gradient(135deg,#FFF5EE,#FFE0CC,#FFA4E0)] p-5 text-center shadow-card transition hover:scale-[1.01]"
        >
          <p className="text-sm font-semibold text-ink">✨ View {formatMonthLabel(viewMonth)} recap</p>
        </Link>
      ) : null}
    </AppShell>
  );
}
