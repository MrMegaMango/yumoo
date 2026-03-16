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

  return (
    <div
      className={cx(
        "relative overflow-hidden border border-white/80 shadow-card",
        sizeClasses[size],
        className
      )}
      style={backgroundStyle}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.45),transparent_45%)]" />
      <div className="absolute left-4 top-4">
        <Tag active={entry.art.status === "ready"}>
          {entry.art.status === "ready" ? "Art ready" : entry.art.status === "failed" ? "Retry me" : "Cute art brewing"}
        </Tag>
      </div>
      {size !== "sm" ? (
        <img
          src={entry.photoDataUrl}
          alt={entry.caption || "Meal photo"}
          className="absolute bottom-4 right-4 h-20 w-20 rounded-[22px] border border-white/70 object-cover shadow-card"
        />
      ) : null}
      {showCaption ? (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white/85 via-white/30 to-transparent p-4">
          <p className="line-clamp-2 text-sm font-semibold text-ink">
            {entry.caption || "Meal without a caption"}
          </p>
        </div>
      ) : null}
    </div>
  );
}

