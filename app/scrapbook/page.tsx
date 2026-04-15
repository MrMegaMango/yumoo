"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { useDiary } from "@/components/diary-provider";
import {
  WeekSpread,
  groupByWeek,
  getCurrentWeekGroup,
  formatWeekRange,
  roundRect,
  dayLabels,
} from "@/components/scrapbook-primitives";

/* ── Page ── */

export default function ScrapbookPage() {
  const { entries, ready } = useDiary();
  const [weekIndex, setWeekIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; caption: string } | null>(null);

  const weeks = useMemo(() => {
    const w = groupByWeek(entries);
    const currentWeek = getCurrentWeekGroup();
    if (w.length === 0 || w[0].weekKey !== currentWeek.weekKey) {
      w.unshift(currentWeek);
    }
    return w;
  }, [entries]);

  const handleSaveImage = useCallback(async () => {
    if (saving) return;
    const week = weeks[weekIndex];
    if (!week) return;
    setSaving(true);

    try {
      const filledDays = week.days
        .map((entry, i) => ({ entry, dayIndex: i }))
        .filter((d): d is { entry: NonNullable<typeof d.entry>; dayIndex: number } => d.entry !== null);

      if (filledDays.length === 0) {
        setSaving(false);
        return;
      }

      const loadImg = async (src: string): Promise<HTMLImageElement> => {
        if (!src) throw new Error("No image URL");
        let objectUrl: string | undefined;
        if (!src.startsWith("data:")) {
          const resp = await fetch(src, { mode: "cors" });
          if (!resp.ok) throw new Error(`Fetch ${resp.status}: ${src.slice(0, 100)}`);
          const blob = await resp.blob();
          objectUrl = URL.createObjectURL(blob);
        }
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            resolve(img);
          };
          img.onerror = () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            reject(new Error(`Image load failed: ${src.slice(0, 100)}`));
          };
          img.src = objectUrl ?? src;
        });
      };

      const loaded = await Promise.all(
        filledDays.map(async ({ entry, dayIndex }) => ({
          img: await loadImg(entry.art.imageUrl || entry.art.imageDataUrl || entry.photoUrl || entry.photoDataUrl),
          caption: entry.caption || entry.mood || "Meal",
          dayIndex,
        }))
      );

      const cols = Math.min(loaded.length, 3);
      const rows = Math.ceil(loaded.length / cols);
      const cellW = 360;
      const cellH = 450;
      const pad = 24;
      const headerH = 100;
      const footerH = 60;
      const canvasW = cols * cellW + (cols + 1) * pad;
      const canvasH = headerH + rows * cellH + (rows + 1) * pad + footerH;

      const canvas = document.createElement("canvas");
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext("2d")!;

      ctx.fillStyle = "#FFF5EA";
      ctx.fillRect(0, 0, canvasW, canvasH);

      ctx.fillStyle = "#3D2E24";
      ctx.font = "bold 36px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(formatWeekRange(week.weekStart), canvasW / 2, 55);
      ctx.fillStyle = "#A08060";
      ctx.font = "18px sans-serif";
      ctx.fillText("weekly food art", canvasW / 2, 82);

      loaded.forEach(({ img, caption }, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = pad + col * (cellW + pad);
        const y = headerH + pad + row * (cellH + pad);

        ctx.fillStyle = "rgba(107,88,78,0.08)";
        roundRect(ctx, x + 4, y + 4, cellW, cellH, 16);
        ctx.fill();

        ctx.fillStyle = "#FFFFFF";
        roundRect(ctx, x, y, cellW, cellH, 16);
        ctx.fill();

        const imgPad = 10;
        const imgW = cellW - imgPad * 2;
        const imgH = cellH - 80;
        const imgX = x + imgPad;
        const imgY = y + imgPad;

        ctx.save();
        roundRect(ctx, imgX, imgY, imgW, imgH, 12);
        ctx.clip();
        const scale = Math.max(imgW / img.width, imgH / img.height);
        const sw = imgW / scale;
        const sh = imgH / scale;
        const sx = (img.width - sw) / 2;
        const sy = (img.height - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, imgX, imgY, imgW, imgH);
        ctx.restore();

        ctx.fillStyle = "#3D2E24";
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "left";
        const truncated = caption.length > 28 ? caption.slice(0, 26) + "..." : caption;
        ctx.fillText(truncated, x + 14, y + cellH - 24);

        ctx.fillStyle = "#A08060";
        ctx.font = "14px sans-serif";
        const d = new Date(week.weekStart);
        d.setDate(d.getDate() + loaded[i].dayIndex);
        ctx.fillText(`${dayLabels[loaded[i].dayIndex]} ${d.getDate()}`, x + 14, y + cellH - 48);
      });

      ctx.fillStyle = "#C4A882";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Yumoo", canvasW / 2, canvasH - 22);

      const fileName = `yumoo-${week.weekKey}.png`;
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) return;

      try {
        const file = new File([blob], fileName, { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file] });
          return;
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = fileName;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error("Save image failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Could not generate image: ${msg}`);
    } finally {
      setSaving(false);
    }
  }, [saving, weeks, weekIndex]);

  useEffect(() => {
    const adjacentIndexes = [weekIndex - 1, weekIndex + 1];
    for (const i of adjacentIndexes) {
      const week = weeks[i];
      if (!week) continue;
      for (const entry of week.days) {
        if (!entry) continue;
        const src = entry.art.imageUrl ?? entry.photoUrl;
        if (src) {
          const img = new Image();
          img.src = src;
        }
      }
    }
  }, [weekIndex, weeks]);

  return (
    <AppShell
      title="Scrapbook"
      subtitle="A quiet collection of your inner appetite."
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
      {/* Prev / week label / Next */}
      <div className="mb-4 flex items-center justify-between px-1">
        <button
          onClick={() => setWeekIndex((i) => Math.min(i + 1, weeks.length - 1))}
          disabled={weekIndex >= weeks.length - 1}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-cocoa shadow-sm ring-1 ring-[#EAD6C7]/40 transition disabled:opacity-30"
          aria-label="Previous week"
        >
          &#x2039;
        </button>
        <span className="text-xs font-semibold tracking-[0.18em] text-cocoa/60">
          {weeks[weekIndex] ? formatWeekRange(weeks[weekIndex].weekStart) : ""}
        </span>
        <button
          onClick={() => setWeekIndex((i) => Math.max(i - 1, 0))}
          disabled={weekIndex === 0}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-cocoa shadow-sm ring-1 ring-[#EAD6C7]/40 transition disabled:opacity-30"
          aria-label="Next week"
        >
          &#x203A;
        </button>
      </div>
      {weeks[weekIndex] && (
        <WeekSpread
          key={weeks[weekIndex].weekKey}
          week={weeks[weekIndex]}
          onImageTap={(src, caption) => setLightbox({ src, caption })}
        />
      )}

      {/* Save as image */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={handleSaveImage}
          disabled={saving}
          className="flex items-center gap-2 rounded-full bg-white/70 px-5 py-2.5 text-sm font-semibold text-cocoa shadow-sm ring-1 ring-[#EAD6C7]/40 transition hover:bg-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save as photo"}
        </button>
      </div>

      {/* Lightbox overlay */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox.src}
            alt={lightbox.caption}
            className="max-h-[75vh] max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="mt-3 text-center text-sm font-medium text-white/80">{lightbox.caption}</p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const [header, data] = lightbox.src.split(",");
                  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
                  const bytes = atob(data);
                  const arr = new Uint8Array(bytes.length);
                  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
                  const blob = new Blob([arr], { type: mime });
                  const fileName = `yumoo-${lightbox.caption.toLowerCase().replace(/\s+/g, "-")}.png`;

                  try {
                    const file = new File([blob], fileName, { type: mime });
                    if (navigator.share && navigator.canShare?.({ files: [file] })) {
                      await navigator.share({ files: [file] });
                      return;
                    }
                  } catch (shareErr) {
                    if (shareErr instanceof Error && shareErr.name === "AbortError") return;
                  }

                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.download = fileName;
                  link.href = url;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  setTimeout(() => URL.revokeObjectURL(url), 5000);
                } catch {
                  // User cancelled or share failed
                }
              }}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-cream"
            >
              Save image
            </button>
            <button
              onClick={() => setLightbox(null)}
              className="rounded-full bg-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/30"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
