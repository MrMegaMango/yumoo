"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { useDiary } from "@/components/diary-provider";
import { Tag, cx } from "@/components/ui";
import {
  formatMonthLabel,
  getYearMonthKey,
  parseLocalDate,
  toLocalDateString,
} from "@/lib/date";
import type { MealEntry } from "@/lib/types";

/* ── Week helpers ── */

function getWeekStart(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekRange(weekStart: Date) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const startMonth = monthNames[weekStart.getMonth()];
  const endMonth = monthNames[end.getMonth()];
  if (startMonth === endMonth) {
    return `${startMonth} ${weekStart.getDate()} – ${end.getDate()}`;
  }
  return `${startMonth} ${weekStart.getDate()} – ${endMonth} ${end.getDate()}`;
}

type WeekGroup = {
  weekKey: string;
  weekStart: Date;
  days: (MealEntry | null)[];
};

function groupByWeek(entries: MealEntry[]): WeekGroup[] {
  const weekMap = new Map<string, Map<string, MealEntry>>();

  for (const entry of entries) {
    const date = parseLocalDate(entry.localDate);
    const ws = getWeekStart(date);
    const weekKey = toLocalDateString(ws);
    if (!weekMap.has(weekKey)) weekMap.set(weekKey, new Map());
    const dayMap = weekMap.get(weekKey)!;
    // Keep first entry per day
    if (!dayMap.has(entry.localDate)) {
      dayMap.set(entry.localDate, entry);
    }
  }

  return [...weekMap.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([weekKey, dayMap]) => {
      const weekStart = parseLocalDate(weekKey);
      const days: (MealEntry | null)[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        const ld = toLocalDateString(d);
        days.push(dayMap.get(ld) ?? null);
      }
      return { weekKey, weekStart, days };
    });
}

function getCurrentWeekGroup(): WeekGroup {
  const ws = getWeekStart(new Date());
  const days: null[] = [null, null, null, null, null, null, null];
  return { weekKey: toLocalDateString(ws), weekStart: ws, days };
}

/* ── Deterministic seed ── */

function seed(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/* ── Organic variations ── */

const rotations = [-3, 1.8, -1.4, 2.6, -2, 1, -2.5, 1.5, 0.6, -1.8];
const xOffsets = [-8, 6, -3, 10, -6, 8, -10, 4, -2, 7];
const yOffsets = [0, 6, 2, 10, 4, 8, 1, 12, 3, 7];

/* ── Decorative stickers ── */

const stickers = ["😊", "⭐", "❤️", "😋", "🍴", "✨", "🌟", "💛", "🧡", "😍"];

function pickSticker(id: string) {
  return stickers[seed(id) % stickers.length];
}

/* ── Washi tape ── */

const tapeColors = [
  "bg-[#FFD4B8]/60",
  "bg-[#D4E8D0]/60",
  "bg-[#FFE8A3]/60",
  "bg-[#E8D0E8]/60",
  "bg-[#F5D0C0]/60",
];

function WashiStrip({ entryId, position }: { entryId: string; position: "top-left" | "top-right" | "bottom-left" }) {
  const s = seed(entryId + position);
  const color = tapeColors[s % tapeColors.length];
  const rotate = [-14, 10, -8, 16, -12][s % 5];
  const posClass =
    position === "top-left"
      ? "-left-2 -top-2"
      : position === "top-right"
        ? "-right-2 -top-2"
        : "-bottom-1 -left-2";

  return (
    <div
      className={`pointer-events-none absolute z-10 h-4 w-12 rounded-[2px] ${color} ${posClass}`}
      style={{ rotate: `${rotate}deg` }}
    />
  );
}

/* ── Paperclip ── */

function Paperclip({ entryId }: { entryId: string }) {
  const s = seed(entryId + "clip");
  if (s % 3 !== 0) return null; // Only show on ~1/3 of cards
  const side = s % 2 === 0 ? "-right-1 top-3" : "-right-1 top-6";
  return (
    <div
      className={`pointer-events-none absolute z-10 text-lg text-cocoa/30 ${side}`}
      style={{ rotate: `${15 + (s % 20)}deg` }}
    >
      📎
    </div>
  );
}

/* ── Polaroid card for scrapbook ── */

function ScrapbookCard({ entry }: { entry: MealEntry }) {
  const s = seed(entry.id);
  const rotate = rotations[s % rotations.length];
  const xOff = xOffsets[s % xOffsets.length];
  const yOff = yOffsets[s % yOffsets.length];
  const date = parseLocalDate(entry.localDate);
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const dateLabel = `${monthNames[date.getMonth()]} ${String(date.getDate()).padStart(2, "0")}`;
  const showSticker = s % 2 === 0;
  const stickerPos = s % 4;

  return (
    <Link href={`/entry/${entry.id}`} className="group block">
      <div
        className="relative rounded-[14px] bg-white p-[6px] pb-10 transition-transform duration-200 group-hover:scale-[1.04] group-hover:z-10"
        style={{
          rotate: `${rotate}deg`,
          translate: `${xOff}px ${yOff}px`,
          boxShadow: "0 3px 20px rgba(107,88,78,0.12), 0 1px 4px rgba(107,88,78,0.07)",
        }}
      >
        {/* Washi tape */}
        <WashiStrip entryId={entry.id} position={s % 2 === 0 ? "top-left" : "top-right"} />

        {/* Paperclip */}
        <Paperclip entryId={entry.id} />

        {/* Photo */}
        <div className="relative overflow-hidden rounded-[10px]">
          <img
            src={entry.photoDataUrl}
            alt={entry.mood ? `${entry.mood} meal` : "Meal"}
            className="block aspect-[4/5] w-full object-cover"
          />
        </div>

        {/* Info below photo */}
        <div className="mt-2 px-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-cocoa/50">
            {dateLabel}
          </p>
          <p className="mt-0.5 truncate text-[13px] font-semibold text-ink">
            {entry.caption || entry.mood || "Meal"}
          </p>
          {entry.mealType && (
            <div className="mt-1 flex gap-1">
              <span className="rounded-full bg-[#FFF0E6] px-2 py-0.5 text-[9px] font-medium text-cocoa">
                {entry.mealType}
              </span>
            </div>
          )}
        </div>

        {/* Floating sticker decoration */}
        {showSticker && (
          <span
            className="pointer-events-none absolute text-lg"
            style={{
              top: stickerPos < 2 ? "-6px" : undefined,
              bottom: stickerPos >= 2 ? "-4px" : undefined,
              left: stickerPos % 2 === 0 ? "-4px" : undefined,
              right: stickerPos % 2 === 1 ? "-4px" : undefined,
            }}
          >
            {pickSticker(entry.id)}
          </span>
        )}
      </div>
    </Link>
  );
}

/* ── Scrapbook-style monthly page covers ── */

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const coverRotations = [-1.5, 1, -0.6, 1.2, -1, 0.7, -1.3, 0.5, -0.8, 1.4, -0.5, 0.9];

const coverTapeColors = [
  "bg-[#FFD4B8]/50", "bg-[#F5C0D0]/50", "bg-[#C8E0C8]/50", "bg-[#FFE8A3]/50",
  "bg-[#B8D8E8]/50", "bg-[#E8D0E8]/50", "bg-[#D4E8D0]/50", "bg-[#FFD8A0]/50",
  "bg-[#D0C0E8]/50", "bg-[#FFD0C0]/50", "bg-[#C0D8D0]/50", "bg-[#E8DCC0]/50",
];

/* Deckled edge for album covers */
const deckledCover = `polygon(
  0% 0%, 97% 0%, 99% 3%, 97% 5%, 100% 8%, 98% 10%, 99% 13%, 97% 16%, 100% 18%, 98% 21%, 99% 24%, 97% 27%,
  100% 30%, 98% 33%, 99% 36%, 97% 39%, 100% 42%, 98% 45%, 99% 48%, 97% 51%, 100% 54%, 98% 57%,
  99% 60%, 97% 63%, 100% 66%, 98% 69%, 99% 72%, 97% 75%, 100% 78%, 98% 81%, 99% 84%, 97% 87%,
  100% 90%, 98% 93%, 99% 96%, 97% 100%,
  0% 100%
)`;

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
            {/* Hero illustration as cover art */}
            <div className="relative mx-auto mb-2 overflow-hidden rounded-[12px] border border-[#EAD6C7]/30 bg-white/40">
              <img
                src="/hero-sticker-book.png"
                alt=""
                className="aspect-square w-full object-contain p-1"
                style={{ filter: hasEntries ? "none" : "saturate(0.4) opacity(0.5)" }}
              />

              {/* Photo previews overlaid on hero */}
              {hasEntries && (
                <div className="absolute inset-0 flex items-end justify-center gap-1 p-2">
                  {entries.slice(0, 3).map((entry, i) => (
                    <div
                      key={entry.id}
                      className="overflow-hidden rounded-[6px] border-2 border-white bg-white shadow-sm"
                      style={{
                        width: "32px",
                        height: "38px",
                        rotate: `${[-4, 2, -2][i]}deg`,
                        padding: "1px",
                        paddingBottom: "6px",
                      }}
                    >
                      <img
                        src={entry.photoDataUrl}
                        alt=""
                        className="h-full w-full rounded-[4px] object-cover"
                      />
                    </div>
                  ))}
                </div>
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

/* ── Sketch frame SVG for empty slots ── */

function SketchFrame({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 150" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 8 C2 3, 8 1, 14 2 L106 4 C112 3, 118 6, 117 12 L115 138 C116 144, 112 148, 106 147 L12 146 C6 147, 2 143, 3 137 Z"
        stroke="#D4BCA8"
        strokeWidth="1.5"
        strokeDasharray="6 4"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M14 16 C12 13, 16 11, 20 12 L100 14 C104 13, 108 16, 107 20 L105 120 C106 124, 103 127, 99 126 L19 125 C15 126, 12 123, 13 119 Z"
        stroke="#D4BCA8"
        strokeWidth="1"
        strokeDasharray="4 5"
        strokeLinecap="round"
        fill="none"
        opacity="0.3"
      />
    </svg>
  );
}

/* ── Scattered mini stars decoration ── */

function ScatteredStars() {
  const starPositions = [
    { top: "8%", left: "12%", size: 10, rotate: 15, opacity: 0.3 },
    { top: "15%", right: "8%", size: 8, rotate: -20, opacity: 0.25 },
    { top: "35%", left: "5%", size: 12, rotate: 30, opacity: 0.2 },
    { top: "50%", right: "10%", size: 9, rotate: -10, opacity: 0.35 },
    { top: "65%", left: "15%", size: 7, rotate: 45, opacity: 0.25 },
    { top: "80%", right: "12%", size: 11, rotate: -25, opacity: 0.3 },
    { top: "25%", left: "48%", size: 8, rotate: 5, opacity: 0.2 },
    { top: "72%", left: "42%", size: 10, rotate: -15, opacity: 0.28 },
  ];

  return (
    <>
      {starPositions.map((pos, i) => (
        <span
          key={i}
          className="pointer-events-none absolute text-yellow-400/60"
          style={{
            top: pos.top,
            left: "left" in pos ? pos.left : undefined,
            right: "right" in pos ? pos.right : undefined,
            fontSize: `${pos.size}px`,
            rotate: `${pos.rotate}deg`,
            opacity: pos.opacity,
          }}
        >
          ✦
        </span>
      ))}
    </>
  );
}

/* ── Deckled edge clip path ── */

const deckledEdgeRight = `polygon(
  0% 0%, 97% 0%, 99% 2%, 97% 4%, 100% 6%, 98% 8%, 99% 10%, 97% 12%, 100% 14%, 98% 16%, 99% 18%, 97% 20%,
  100% 22%, 98% 24%, 99% 26%, 97% 28%, 100% 30%, 98% 32%, 99% 34%, 97% 36%, 100% 38%, 98% 40%,
  99% 42%, 97% 44%, 100% 46%, 98% 48%, 99% 50%, 97% 52%, 100% 54%, 98% 56%, 99% 58%, 97% 60%,
  100% 62%, 98% 64%, 99% 66%, 97% 68%, 100% 70%, 98% 72%, 99% 74%, 97% 76%, 100% 78%, 98% 80%,
  99% 82%, 97% 84%, 100% 86%, 98% 88%, 99% 90%, 97% 92%, 100% 94%, 98% 96%, 99% 98%, 97% 100%,
  0% 100%
)`;

/* ── Weekly scrapbook spread (scattered polaroids on journal page) ── */

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const polaroidLayouts = [
  { col: 0, rotate: -3, xOff: 4, yOff: 0 },
  { col: 1, rotate: 2.2, xOff: -2, yOff: 8 },
  { col: 0, rotate: 1.5, xOff: -6, yOff: 0 },
  { col: 1, rotate: -2, xOff: 6, yOff: 4 },
  { col: 0, rotate: -1.2, xOff: 8, yOff: 0 },
  { col: 1, rotate: 2.8, xOff: -4, yOff: 10 },
  { col: 0, rotate: -2.5, xOff: 2, yOff: 0 },
];

function WeekSpread({ week }: { week: WeekGroup }) {
  const col0 = week.days.map((entry, i) => ({ entry, i })).filter((_, idx) => polaroidLayouts[idx].col === 0);
  const col1 = week.days.map((entry, i) => ({ entry, i })).filter((_, idx) => polaroidLayouts[idx].col === 1);

  function renderSlot(entry: MealEntry | null, dayIndex: number) {
    const layout = polaroidLayouts[dayIndex];
    const d = new Date(week.weekStart);
    d.setDate(d.getDate() + dayIndex);
    const dayNum = d.getDate();

    if (entry) {
      const s = seed(entry.id);
      const showSticker = s % 2 === 0;

      return (
        <Link href={`/entry/${entry.id}`} className="group block">
          <div
            className="relative rounded-[14px] bg-white p-[6px] pb-8 transition-transform duration-200 group-hover:scale-[1.04] group-hover:z-10"
            style={{
              rotate: `${layout.rotate}deg`,
              translate: `${layout.xOff}px ${layout.yOff}px`,
              boxShadow: "0 3px 20px rgba(107,88,78,0.12), 0 1px 4px rgba(107,88,78,0.07)",
            }}
          >
            <WashiStrip entryId={entry.id} position={s % 2 === 0 ? "top-left" : "top-right"} />
            <Paperclip entryId={entry.id} />

            <div className="relative overflow-hidden rounded-[10px]">
              <img
                src={entry.photoDataUrl}
                alt={entry.mood ? `${entry.mood} meal` : "Meal"}
                className="block aspect-[4/5] w-full object-cover"
              />
            </div>

            <div className="mt-1.5 px-1">
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-cocoa/40">
                {dayLabels[dayIndex]} {dayNum}
              </p>
              <p className="mt-0.5 truncate text-[12px] font-semibold text-ink">
                {entry.caption || entry.mood || "Meal"}
              </p>
            </div>

            {showSticker && (
              <span
                className="pointer-events-none absolute text-base"
                style={{
                  bottom: "-6px",
                  right: s % 3 === 0 ? "-6px" : undefined,
                  left: s % 3 !== 0 ? "-6px" : undefined,
                }}
              >
                {pickSticker(entry.id)}
              </span>
            )}
          </div>
        </Link>
      );
    }

    // Sketch frame empty slot
    return (
      <div
        className="relative"
        style={{
          rotate: `${layout.rotate}deg`,
          translate: `${layout.xOff}px ${layout.yOff}px`,
        }}
      >
        <SketchFrame className="h-auto w-full" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl text-cocoa/15">📷</span>
          <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-cocoa/30">
            {dayLabels[dayIndex]} {dayNum}
          </p>
          <p className="mt-0.5 text-[10px] text-cocoa/20">waiting for art</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Journal page with deckled edge */}
      <div
        className="relative overflow-hidden rounded-l-[8px] border-l-[6px] border-l-[#C4A882]"
        style={{
          background: "linear-gradient(170deg, #FFF9F0 0%, #FFF3E4 40%, #FFEDD8 100%)",
          clipPath: deckledEdgeRight,
          boxShadow: "4px 4px 24px rgba(107,88,78,0.12), inset 0 0 40px rgba(200,170,140,0.08)",
        }}
      >
        {/* Paper grain texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Binding stitch dots */}
        <div className="absolute bottom-4 left-1 top-4 flex flex-col justify-between">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="h-1 w-1 rounded-full bg-[#C4A882]/30" />
          ))}
        </div>

        {/* Scattered stars */}
        <ScatteredStars />

        <div className="relative px-5 py-6">
          {/* Week header */}
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-cocoa/40">
            {formatWeekRange(week.weekStart)}
          </p>

          {/* Scattered 2-column polaroid layout */}
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-4">
              {col0.map(({ entry, i }) => (
                <div key={i}>{renderSlot(entry, i)}</div>
              ))}
            </div>
            <div className="flex flex-1 flex-col gap-4 pt-8">
              {col1.map(({ entry, i }) => (
                <div key={i}>{renderSlot(entry, i)}</div>
              ))}
            </div>
          </div>

          {/* Hero illustration as center decoration */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <img
              src="/hero-sticker-book.png"
              alt=""
              className="h-64 w-64 object-contain opacity-[0.12] saturate-50"
            />
          </div>
        </div>
      </div>
    </div>
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

export default function MyPagesPage() {
  const { entries, ready } = useDiary();
  const [tab, setTab] = useState<"scrapbook" | "stacks">("scrapbook");

  const months = useMemo(() => groupByMonth(entries), [entries]);
  const weeks = useMemo(() => {
    const w = groupByWeek(entries);
    // Always include current week even if empty
    const currentWeek = getCurrentWeekGroup();
    if (w.length === 0 || w[0].weekKey !== currentWeek.weekKey) {
      w.unshift(currentWeek);
    }
    return w;
  }, [entries]);

  return (
    <AppShell
      title="My Pages"
      subtitle="A quiet collection of your inner appetite."
      headerTrailing={
        <Tag active>{ready ? `${entries.length} meals` : "..."}</Tag>
      }
    >
      {/* Tab switcher */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-full bg-white/70 p-1 ring-1 ring-[#EAD6C7]/40 backdrop-blur-sm">
          <button
            onClick={() => setTab("scrapbook")}
            className={cx(
              "rounded-full px-5 py-2 text-sm font-semibold transition",
              tab === "scrapbook"
                ? "bg-ink text-white shadow-card"
                : "text-cocoa hover:bg-cream"
            )}
          >
            Weekly
          </button>
          <button
            onClick={() => setTab("stacks")}
            className={cx(
              "rounded-full px-5 py-2 text-sm font-semibold transition",
              tab === "stacks"
                ? "bg-ink text-white shadow-card"
                : "text-cocoa hover:bg-cream"
            )}
          >
            Stacks
          </button>
        </div>
      </div>

      {tab === "scrapbook" ? (
        /* ── Weekly scrapbook view ── */
        <div className="space-y-6">
          {weeks.map((week) => (
            <WeekSpread key={week.weekKey} week={week} />
          ))}
        </div>
      ) : (
        /* ── Stacks view (12 vintage album covers) ── */
        <div>
          <div className="mb-5 flex items-center gap-2">
            <h2 className="text-xl font-semibold text-ink">Monthly Stacks</h2>
            <span className="text-base">✨</span>
          </div>
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
        </div>
      )}
    </AppShell>
  );
}
