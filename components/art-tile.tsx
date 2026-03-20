import type { CSSProperties } from "react";

import { paletteBackground } from "@/lib/art";
import type { MealEntry } from "@/lib/types";
import { cx, Tag } from "@/components/ui";

const sizeClasses = {
  sm: "h-16 rounded-[18px]",
  md: "h-32 rounded-[24px]",
  lg: "h-56 rounded-[32px]"
};

export function ArtTile({
  entry,
  size = "md",
  showCaption = false,
  className
}: {
  entry: MealEntry;
  size?: "sm" | "md" | "lg";
  showCaption?: boolean;
  className?: string;
}) {
  const backgroundStyle = paletteBackground(entry.art.palette) as CSSProperties;
  const artImageUrl =
    entry.art.status === "ready" ? entry.art.imageDataUrl : undefined;
  const statusLabel =
    entry.art.status === "ready"
      ? "Art ready"
      : entry.art.status === "failed"
        ? "Retry art"
        : "Generating art";
  const captionTextColor = artImageUrl ? "text-white" : "text-ink";

  return (
    <div
      className={cx(
        "relative overflow-hidden border border-white/80 shadow-card",
        sizeClasses[size],
        className
      )}
      style={artImageUrl ? undefined : backgroundStyle}
    >
      {artImageUrl ? (
        <img
          src={artImageUrl}
          alt={entry.mood ? `${entry.mood} illustrated meal art` : "Illustrated meal art"}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <div
        className={cx(
          "absolute inset-0",
          artImageUrl
            ? "bg-[linear-gradient(180deg,rgba(20,14,12,0.12),rgba(20,14,12,0.08)_35%,rgba(20,14,12,0.44)_100%)]"
            : "bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.45),transparent_45%)]"
        )}
      />
      <div className="absolute left-4 top-4">
        <Tag active={entry.art.status === "ready"}>
          {statusLabel}
        </Tag>
      </div>
      {size !== "sm" ? (
        <img
          src={entry.photoDataUrl}
          alt={entry.mood ? `${entry.mood} Meal photo` : "Meal photo"}
          className="absolute bottom-4 right-4 h-20 w-20 rounded-[22px] border border-white/70 object-cover shadow-card"
        />
      ) : null}
      {showCaption ? (
        <div
          className={cx(
            "absolute inset-x-0 bottom-0 p-4",
            artImageUrl
              ? "bg-gradient-to-t from-black/45 via-black/10 to-transparent"
              : "bg-gradient-to-t from-white/85 via-white/30 to-transparent"
          )}
        >
          <p className={cx("line-clamp-2 text-sm font-semibold", captionTextColor)}>
            {entry.mood || entry.caption || "Meal"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
