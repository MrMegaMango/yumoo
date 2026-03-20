"use client";

import { type FormEvent, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useDiary } from "@/components/diary-provider";
import { Button, Card, buttonClasses, cx } from "@/components/ui";
import { fromDateAndTime, toLocalDateString, toTimeInputValue } from "@/lib/date";
import { getCurrentStreak } from "@/lib/diary";
import { mealTypes, moods, type MealEntry, type MealType, type Mood } from "@/lib/types";

type EntryFormProps = {
  mode: "create" | "edit";
  existingEntry?: MealEntry;
  defaultLocalDate?: string;
};

function formatMealType(mealType: MealType) {
  return mealType;
}

export function EntryForm({
  mode,
  existingEntry,
  defaultLocalDate
}: EntryFormProps) {
  const router = useRouter();
  const { entries, saveEntry } = useDiary();
  const streak = getCurrentStreak(entries);
  const weekGoal = 7;
  const daysLeft = Math.max(0, weekGoal - streak);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(existingEntry?.photoDataUrl ?? "");
  const [caption] = useState(existingEntry?.caption ?? "");
  const [mood, setMood] = useState<Mood | undefined>(existingEntry?.mood);
  const isCustomMood = existingEntry?.mood && !(moods as readonly string[]).includes(existingEntry.mood);
  const [customMood, setCustomMood] = useState(isCustomMood ? existingEntry.mood : "");
  const [showCustomMood, setShowCustomMood] = useState(!!isCustomMood);
  const [mealType, setMealType] = useState<MealType | undefined>(existingEntry?.mealType);
  const isCustomPreset = existingEntry?.mealType && !(mealTypes as readonly string[]).includes(existingEntry.mealType);
  const [customTag, setCustomTag] = useState(isCustomPreset ? existingEntry.mealType : "");
  const [showCustom, setShowCustom] = useState(!!isCustomPreset);
  const [dateValue, setDateValue] = useState(
    existingEntry?.localDate ?? defaultLocalDate ?? toLocalDateString(new Date())
  );
  const [timeValue, setTimeValue] = useState(
    existingEntry ? toTimeInputValue(existingEntry.takenAt) : toTimeInputValue(new Date())
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!selectedFile) {
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    startTransition(() => {
      void (async () => {
        try {
          const entry = await saveEntry(
            {
              caption,
              mood,
              mealType,
              takenAt: fromDateAndTime(dateValue, timeValue),
              photoFile: selectedFile,
              photoDataUrl: existingEntry?.photoDataUrl
            },
            existingEntry?.id
          );

          router.push(`/day/${entry.localDate}`);
        } catch (submitError) {
          setError(
            submitError instanceof Error
              ? submitError.message
              : "This entry could not be saved."
          );
        }
      })();
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cocoa/70">
              Photo
            </p>
            <p className="mt-1 text-sm text-cocoa">
              Your meal gets an art makeover that feels like your mood.
            </p>
          </div>
          <label className={buttonClasses("secondary", "cursor-pointer")}>
            {existingEntry ? "Swap photo" : "Add photo"}
            <input
              className="hidden"
              type="file"
              accept="image/*"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <div className="overflow-hidden rounded-[28px] border border-[#ECDACC] bg-[#FFF7F0]">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Meal preview"
              className="h-72 w-full object-cover"
            />
          ) : (
            <label className="relative flex h-72 cursor-pointer flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_top_left,_rgba(255,210,186,0.85),_transparent_35%),linear-gradient(180deg,#FFF8F2_0%,#FFEBDC_100%)] px-8 text-center text-sm leading-6 text-cocoa transition active:scale-[0.98]">
              <input
                className="hidden"
                type="file"
                accept="image/*"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
              <img
                src="/side-pic.png"
                alt=""
                className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
              />
              <svg className="relative h-10 w-10 text-cocoa/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
              </svg>
              <span className="relative mt-2">Snap a photo, pick your mood, and let&apos;s tuck it away ✨</span>
            </label>
          )}
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cocoa/70">
            Mood
          </p>
          <div className="flex gap-3">
            {moods.map((option) => {
              const active = option === mood && !showCustomMood;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    if (active) {
                      setMood(undefined);
                    } else {
                      setMood(option);
                      setShowCustomMood(false);
                      setCustomMood("");
                    }
                  }}
                  className={cx(
                    "flex h-12 w-12 items-center justify-center rounded-full text-2xl transition",
                    active
                      ? "bg-ink shadow-card ring-2 ring-ink/30 scale-110"
                      : "bg-white/80 ring-1 ring-[#EAD6C7]"
                  )}
                >
                  {option}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                if (showCustomMood) {
                  setShowCustomMood(false);
                  setCustomMood("");
                  setMood(undefined);
                } else {
                  setShowCustomMood(true);
                  setMood(undefined);
                }
              }}
              className={cx(
                "flex h-12 w-12 items-center justify-center rounded-full text-sm transition",
                showCustomMood
                  ? "bg-ink text-white shadow-card ring-2 ring-ink/30 scale-110"
                  : "bg-white/80 text-cocoa ring-1 ring-[#EAD6C7]"
              )}
            >
              ✏️
            </button>
          </div>
          {showCustomMood ? (
            <input
              className="mt-2 w-full rounded-full border border-[#EAD6C7] bg-white/80 px-4 py-2 text-sm text-cocoa placeholder:text-cocoa/40 focus:outline-none focus:ring-2 focus:ring-ink/30"
              type="text"
              placeholder="type your mood..."
              maxLength={20}
              value={customMood}
              autoFocus
              onChange={(e) => {
                const val = e.target.value;
                setCustomMood(val);
                setMood(val.trim() ? val.trim() : undefined);
              }}
            />
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cocoa/70">
            Vibe tag
          </p>
          <div className="flex flex-wrap gap-2">
            {mealTypes.map((option) => {
              const active = option === mealType && !showCustom;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    if (active) {
                      setMealType(undefined);
                    } else {
                      setMealType(option);
                      setShowCustom(false);
                      setCustomTag("");
                    }
                  }}
                  className={cx(
                    "rounded-full px-3 py-2 text-sm transition",
                    active
                      ? "bg-ink text-white shadow-card"
                      : "bg-white/80 text-cocoa ring-1 ring-[#EAD6C7]"
                  )}
                >
                  {formatMealType(option)}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                if (showCustom) {
                  setShowCustom(false);
                  setCustomTag("");
                  setMealType(undefined);
                } else {
                  setShowCustom(true);
                  setMealType(undefined);
                }
              }}
              className={cx(
                "rounded-full px-3 py-2 text-sm transition",
                showCustom
                  ? "bg-ink text-white shadow-card"
                  : "bg-white/80 text-cocoa ring-1 ring-[#EAD6C7]"
              )}
            >
              ✏️ Other
            </button>
          </div>
          {showCustom ? (
            <input
              className="mt-2 w-full rounded-full border border-[#EAD6C7] bg-white/80 px-4 py-2 text-sm text-cocoa placeholder:text-cocoa/40 focus:outline-none focus:ring-2 focus:ring-ink/30"
              type="text"
              placeholder="type your own vibe..."
              maxLength={30}
              value={customTag}
              autoFocus
              onChange={(e) => {
                const val = e.target.value;
                setCustomTag(val);
                setMealType(val.trim() ? val.trim() : undefined);
              }}
            />
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-cocoa/70">
            Date
          </label>
          <input
            className="field"
            type="date"
            value={dateValue}
            onChange={(event) => setDateValue(event.target.value)}
          />
        </div>

      </Card>

      {error ? (
        <Card className="border-[#E8BCB7] bg-[#FFF3F1] text-sm text-[#8F403E]">{error}</Card>
      ) : null}

      {mode === "create" ? (
        <div className="rounded-[20px] p-4" style={{
          background: streak === 0
            ? "#FFF5EE"
            : streak <= 2
            ? "linear-gradient(135deg, #FFF5EE, #FFE0CC)"
            : streak <= 4
            ? "linear-gradient(135deg, #FFE0CC, #FFBFA3, #FFA4E0)"
            : streak <= 6
            ? "linear-gradient(135deg, #FFBFA3, #FF8ED4, #B88CFF)"
            : "linear-gradient(135deg, #FF8ED4, #B88CFF, #7DD3FC, #FDE68A)"
        }}>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-ink">
              {daysLeft === 0
                ? "✨ art recap unlocked let's gooo"
                : daysLeft >= 6
                ? `${daysLeft} more entries until your weekly art is ready 🍳`
                : daysLeft >= 4
                ? `${daysLeft} days left — the vibes are building 💫`
                : daysLeft >= 2
                ? `only ${daysLeft} more — your recap is almost ready to serve 🍽️`
                : "1 more day and it's giving masterpiece 🎨"}
            </span>
            <span className="text-sm font-bold text-ink">{streak}/{weekGoal} 🔥</span>
          </div>
          <div className="mt-3 flex gap-1.5">
            {Array.from({ length: weekGoal }, (_, i) => (
              <div
                key={i}
                className="h-3 flex-1 rounded-full transition-all"
                style={{
                  background: i < streak
                    ? [
                        "#FFCBA4",
                        "#FFB088",
                        "#FF926B",
                        "#FF7EB3",
                        "#D97BFF",
                        "#A78BFA",
                        "#7DD3FC"
                      ][i]
                    : "rgba(255,255,255,0.6)"
                }}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <Button className="flex-1" type="submit" disabled={isPending}>
          {isPending ? "Logging the vibe..." : mode === "create" ? "Drop it in 🍽️" : "Update the vibe"}
        </Button>
        <Link href={existingEntry ? `/day/${existingEntry.localDate}` : "/calendar"} className={buttonClasses("secondary")}>
          Cancel
        </Link>
      </div>

      <div className="flex items-start gap-3 px-1 py-2 text-sm leading-6 text-cocoa/60">
        <span className="text-base">🔒</span>
        <p>
          <span className="font-semibold text-cocoa/80">Your private vault</span> — nothing leaves this device unless you say so.
        </p>
      </div>

    </form>
  );
}
