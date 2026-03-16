"use client";

import { type FormEvent, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useDiary } from "@/components/diary-provider";
import { Button, Card, buttonClasses, cx } from "@/components/ui";
import { fromDateAndTime, toLocalDateString, toTimeInputValue } from "@/lib/date";
import { mealTypes, type MealEntry, type MealType } from "@/lib/types";

type EntryFormProps = {
  mode: "create" | "edit";
  existingEntry?: MealEntry;
  defaultLocalDate?: string;
};

function formatMealType(mealType: MealType) {
  return mealType.charAt(0).toUpperCase() + mealType.slice(1);
}

export function EntryForm({
  mode,
  existingEntry,
  defaultLocalDate
}: EntryFormProps) {
  const router = useRouter();
  const { saveEntry } = useDiary();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(existingEntry?.photoDataUrl ?? "");
  const [caption, setCaption] = useState(existingEntry?.caption ?? "");
  const [mealType, setMealType] = useState<MealType | undefined>(existingEntry?.mealType);
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
              Your calendar updates right away, then the cute version settles in.
            </p>
          </div>
          <div className="flex gap-2">
            <label className={buttonClasses("secondary", "cursor-pointer")}>
              Album
              <input
                className="hidden"
                type="file"
                accept="image/*"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <label className={buttonClasses("secondary", "cursor-pointer")}>
              Camera
              <input
                className="hidden"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>
        <div className="overflow-hidden rounded-[28px] border border-[#ECDACC] bg-[#FFF7F0]">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Meal preview"
              className="h-72 w-full object-cover"
            />
          ) : (
            <div className="flex h-72 items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(255,210,186,0.85),_transparent_35%),linear-gradient(180deg,#FFF8F2_0%,#FFEBDC_100%)] px-8 text-center text-sm leading-6 text-cocoa">
              Add a favorite plate, cafe stop, or late-night snack and let it become part of the
              month.
            </div>
          )}
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-cocoa/70">
            Caption
          </label>
          <textarea
            className="field min-h-24 resize-none"
            placeholder="What made this one memorable?"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            maxLength={120}
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cocoa/70">
            Meal type
          </p>
          <div className="flex flex-wrap gap-2">
            {mealTypes.map((option) => {
              const active = option === mealType;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMealType(active ? undefined : option)}
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
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-cocoa/70">
              Time
            </label>
            <input
              className="field"
              type="time"
              value={timeValue}
              onChange={(event) => setTimeValue(event.target.value)}
            />
          </div>
        </div>

        <div className="rounded-[24px] bg-cream p-4 text-sm leading-6 text-cocoa">
          <p className="font-semibold text-ink">Private for now</p>
          <p className="mt-1">
            Your diary stays on this device unless you choose to save it somewhere permanent later.
          </p>
        </div>
      </Card>

      {error ? (
        <Card className="border-[#E8BCB7] bg-[#FFF3F1] text-sm text-[#8F403E]">{error}</Card>
      ) : null}

      <div className="flex items-center gap-3">
        <Button className="flex-1" type="submit" disabled={isPending}>
          {isPending ? "Saving..." : mode === "create" ? "Save meal" : "Update meal"}
        </Button>
        <Link href={existingEntry ? `/day/${existingEntry.localDate}` : "/calendar"} className={buttonClasses("secondary")}>
          Cancel
        </Link>
      </div>

    </form>
  );
}
