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

        {/* Art / Photo */}
        <div className="relative overflow-hidden rounded-[10px]">
          <img
            src={entry.art.status === "ready" && entry.art.imageDataUrl ? entry.art.imageDataUrl : entry.photoDataUrl}
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

/* ── Sketched illustrations for empty slots ── */

function SketchCamera({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 16 C7 14, 9 12, 12 12 L16 12 L18 9 C19 8, 20 8, 21 8 L27 8 C28 8, 29 8, 30 9 L32 12 L36 12 C39 12, 41 14, 40 16 L39 34 C40 37, 38 39, 35 38 L13 38 C10 39, 8 37, 9 34 Z"
        stroke="#A08060"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
      <circle cx="24" cy="24" r="7" stroke="#A08060" strokeWidth="2.4" opacity="0.55" />
      <circle cx="24" cy="24" r="4" stroke="#A08060" strokeWidth="1.8" strokeDasharray="2 2" opacity="0.4" />
      <circle cx="34" cy="15" r="1.5" fill="#A08060" opacity="0.45" />
    </svg>
  );
}

function SketchBowl({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 22 C8 22, 10 34, 24 36 C38 34, 40 22, 40 22"
        stroke="#A08060" strokeWidth="2.8" strokeLinecap="round" opacity="0.6"
      />
      <path d="M6 22 L42 22" stroke="#A08060" strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
      <path d="M14 18 C14 14, 18 12, 18 12" stroke="#A08060" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />
      <path d="M22 16 C22 12, 24 10, 24 10" stroke="#A08060" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />
      <path d="M30 18 C30 14, 32 13, 32 13" stroke="#A08060" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />
      <ellipse cx="24" cy="27" rx="10" ry="3" stroke="#A08060" strokeWidth="1.4" strokeDasharray="2 3" opacity="0.3" />
    </svg>
  );
}

function SketchCoffee({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 18 L14 36 C14 38, 16 40, 20 40 L28 40 C32 40, 34 38, 34 36 L36 18"
        stroke="#A08060" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"
      />
      <path d="M10 18 L38 18" stroke="#A08060" strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
      <path
        d="M36 22 C40 22, 42 24, 42 28 C42 32, 40 34, 36 34"
        stroke="#A08060" strokeWidth="2.4" strokeLinecap="round" opacity="0.5"
      />
      <path d="M18 14 C18 10, 20 8, 20 8" stroke="#A08060" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />
      <path d="M26 12 C26 9, 28 7, 28 7" stroke="#A08060" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />
      <ellipse cx="12" cy="42" rx="14" ry="1.5" fill="#A08060" opacity="0.1" />
    </svg>
  );
}

function SketchToast({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 18 C10 10, 16 6, 24 6 C32 6, 38 10, 38 18 L38 38 C38 40, 36 42, 34 42 L14 42 C12 42, 10 40, 10 38 Z"
        stroke="#A08060" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"
      />
      <path
        d="M16 22 C16 18, 20 16, 24 16 C28 16, 32 18, 32 22 L32 32 L16 32 Z"
        stroke="#A08060" strokeWidth="1.8" strokeDasharray="2 3" strokeLinecap="round" opacity="0.4"
      />
      <circle cx="22" cy="26" r="1.2" fill="#A08060" opacity="0.35" />
      <circle cx="26" cy="24" r="1" fill="#A08060" opacity="0.3" />
      <circle cx="24" cy="28" r="0.8" fill="#A08060" opacity="0.25" />
    </svg>
  );
}

const slotIllustrations = [SketchCamera, SketchBowl, SketchCoffee, SketchCamera, SketchToast, SketchCoffee, SketchCamera];

/* ── Sketched tiny star ── */

function SketchStar({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 1 L9.5 5.5 L14 6.5 L10.5 9.5 L11.5 14 L8 11.5 L4.5 14 L5.5 9.5 L2 6.5 L6.5 5.5 Z"
        stroke="#A08060"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}

/* ── Deckled edge for empty card (left + bottom) ── */

const deckledCard = `polygon(
  3% 0%, 100% 0%, 100% 97%,
  97% 99%, 95% 97%, 92% 100%, 90% 98%, 87% 99%, 85% 97%, 82% 100%, 80% 98%,
  77% 99%, 75% 97%, 72% 100%, 70% 98%, 67% 99%, 65% 97%, 62% 100%, 60% 98%,
  57% 99%, 55% 97%, 52% 100%, 50% 98%, 47% 99%, 45% 97%, 42% 100%, 40% 98%,
  37% 99%, 35% 97%, 32% 100%, 30% 98%, 27% 99%, 25% 97%, 22% 100%, 20% 98%,
  17% 99%, 15% 97%, 12% 100%, 10% 98%, 7% 99%, 5% 97%, 2% 100%, 0% 98%,
  0% 97%, 2% 95%, 0% 92%, 2% 90%, 0% 87%, 2% 85%, 0% 82%, 2% 80%,
  0% 77%, 2% 75%, 0% 72%, 2% 70%, 0% 67%, 2% 65%, 0% 62%, 2% 60%,
  0% 57%, 2% 55%, 0% 52%, 2% 50%, 0% 47%, 2% 45%, 0% 42%, 2% 40%,
  0% 37%, 2% 35%, 0% 32%, 2% 30%, 0% 27%, 2% 25%, 0% 22%, 2% 20%,
  0% 17%, 2% 15%, 0% 12%, 2% 10%, 0% 7%, 2% 5%, 0% 2%, 3% 0%
)`;

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
                src={entry.art.imageDataUrl ?? entry.photoDataUrl}
                alt={entry.mood ? `${entry.mood} meal` : "Meal"}
                className="block aspect-[4/5] w-full object-cover"
              />
            </div>

            <div className="mt-1.5 px-1">
              <p className="text-[10px] font-bold tracking-[0.18em] text-cocoa/60">
                {dayLabels[dayIndex]} {dayNum}
              </p>
              <p className="mt-0.5 truncate text-[12px] text-ink">
                {(entry.caption || entry.mood || "meal").toLowerCase()}
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

    // Deckled paper empty slot — tapping navigates to add a meal for this day
    const localDate = toLocalDateString(d);
    return (
      <Link href={`/entry/new?date=${localDate}`} className="group block">
      <div
        className="relative transition-transform duration-200 group-hover:scale-[1.04] group-hover:z-10"
        style={{
          rotate: `${layout.rotate}deg`,
          translate: `${layout.xOff}px ${layout.yOff}px`,
        }}
      >
        <div
          className="relative overflow-hidden p-3 pb-7"
          style={{
            background: "linear-gradient(170deg, #FFF9F0 0%, #FFF3E4 50%, #FFEDD8 100%)",
            clipPath: deckledCard,
            boxShadow: "2px 3px 12px rgba(107,88,78,0.1)",
          }}
        >
          {/* Hand-drawn border */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 160 200" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M8 6 C5 4, 12 2, 20 3 L140 5 C148 3, 155 6, 154 10 L152 188 C153 194, 148 198, 140 196 L18 195 C10 197, 5 193, 7 188 Z"
              stroke="#C4A882"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.45"
            />
            <path
              d="M14 14 C11 11, 18 9, 24 10 L136 12 C142 10, 148 14, 146 18 L144 170 C145 176, 140 179, 134 178 L22 176 C16 178, 12 174, 14 168 Z"
              stroke="#C4A882"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.25"
            />
          </svg>

          {/* Paper grain */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />

          {/* Sketched illustration + stars inside */}
          <div className="flex aspect-[4/5] flex-col items-center justify-center">
            {(() => { const Illust = slotIllustrations[dayIndex]; return <Illust className="h-14 w-14" />; })()}
            <SketchStar
              className="absolute h-5 w-5"
              style={{ top: "10%", right: "12%", rotate: "12deg" }}
            />
            <SketchStar
              className="absolute h-4 w-4"
              style={{ bottom: "26%", left: "8%", rotate: "-18deg" }}
            />
          </div>

          {/* Day label + text */}
          <div className="mt-1 px-0.5">
            <p className="text-[10px] font-bold tracking-[0.18em] text-cocoa/70">
              {dayLabels[dayIndex]} {dayNum}
            </p>
            <p className="mt-0.5 text-[10px] italic tracking-[0.12em] text-cocoa/45">
              waiting for art
            </p>
          </div>
        </div>
      </div>
      </Link>
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
          <p className="mb-4 text-center text-xs font-bold tracking-[0.2em] text-cocoa/60">
            {formatWeekRange(week.weekStart)}
          </p>

          {/* Scattered 2-column polaroid layout */}
          <div className="relative flex gap-3">
            <div className="flex flex-1 flex-col gap-4">
              {col0.map(({ entry, i }) => (
                <div key={i}>{renderSlot(entry, i)}</div>
              ))}
            </div>

            <div className="flex flex-1 flex-col gap-4 pt-8">
              {col1.map(({ entry, i }) => (
                <div key={i}>{renderSlot(entry, i)}</div>
              ))}
              {/* Dogavacado filling empty slot next to Sat */}
              <div className="overflow-hidden rounded-[14px]">
                <img
                  src="/dogavacado.png"
                  alt=""
                  className="aspect-[4/5] w-full object-cover opacity-[0.35]"
                />
              </div>
            </div>
          </div>

          {/* Hero illustration as center decoration */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <img
              src="/sun-drink.png"
              alt=""
              className="h-64 w-64 object-contain opacity-[0.35] saturate-50"
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
        <div className="relative" style={{ rotate: "8deg" }}>
          {/* Paperclip holding the tag */}
          <span className="absolute -left-3 -top-3 z-10 text-lg text-cocoa/30" style={{ rotate: "-15deg" }}>📎</span>
          {/* Stitched tag */}
          <div
            className="rounded-[8px] border border-[#D4BCA8]/50 px-3 py-1.5"
            style={{
              background: "linear-gradient(135deg, #F5E6D0, #EDD8C0)",
              boxShadow: "1px 2px 6px rgba(107,88,78,0.1)",
            }}
          >
            {/* Stitching effect */}
            <div
              className="pointer-events-none absolute inset-[3px] rounded-[6px] border border-dashed border-[#C4A882]/30"
            />
            <p className="relative font-display text-[11px] lowercase italic tracking-[0.12em] text-ink/70">
              {ready ? `${entries.length} meals` : "..."}
            </p>
          </div>
        </div>
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
