"use client";

import { use } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ArtTile } from "@/components/art-tile";
import { useDiary } from "@/components/diary-provider";
import { EntryForm } from "@/components/entry-form";
import { Button, Card, Tag } from "@/components/ui";
import { formatFullDate, formatTimeLabel } from "@/lib/date";

export default function EntryDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { ready, getEntry, deleteEntry, retryArt } = useDiary();
  const entry = getEntry(resolvedParams.id);

  if (!ready) {
    return (
      <AppShell title="Loading entry" subtitle="Pulling your meal details together." showFab={false}>
        <Card>Loading...</Card>
      </AppShell>
    );
  }

  if (!entry) {
    return (
      <AppShell title="Entry not found" subtitle="It may have been deleted already." showFab={false}>
        <Card className="text-sm leading-6 text-cocoa">
          There is no saved meal for this link anymore.
        </Card>
      </AppShell>
    );
  }

  const currentEntry = entry;
  const outOfCredits =
    currentEntry.art.status === "failed" &&
    currentEntry.art.error?.toLowerCase().includes("credits");

  function handleDelete() {
    if (!window.confirm("Delete this entry?")) {
      return;
    }

    deleteEntry(currentEntry.id);
    router.push("/calendar");
  }

  return (
    <AppShell
      title={currentEntry.mood ? `${currentEntry.mood} Meal` : "Meal detail"}
      subtitle={`${formatFullDate(currentEntry.localDate)} at ${formatTimeLabel(currentEntry.takenAt)}`}
      showFab={false}
      headerTrailing={currentEntry.mealType ? <Tag>{currentEntry.mealType}</Tag> : null}
    >
      <ArtTile entry={currentEntry} size="lg" showCaption />

      <Card className="overflow-hidden p-0">
        <img
          src={currentEntry.photoUrl ?? currentEntry.photoDataUrl}
          alt={currentEntry.mood ? `${currentEntry.mood} Meal photo` : "Meal photo"}
          className="h-80 w-full object-cover"
        />
      </Card>

      <div className="flex gap-3">
        {outOfCredits ? (
          <Button
            className="flex-1"
            variant="secondary"
            onClick={() => router.push("/settings")}
          >
            Get more credits
          </Button>
        ) : (
          <Button
            className="flex-1"
            variant="secondary"
            onClick={() => retryArt(currentEntry.id)}
            disabled={currentEntry.art.status === "queued"}
          >
            {currentEntry.art.status === "queued"
              ? <span className="dot-animation">Generating art<span>.</span><span>.</span><span>.</span></span>
              : currentEntry.art.status === "failed"
                ? "Retry art"
                : "Regenerate art"}
          </Button>
        )}
        <Button className="flex-1" variant="danger" onClick={handleDelete}>
          Delete
        </Button>
      </div>

      {currentEntry.art.status === "failed" && currentEntry.art.error ? (
        <Card className="border-[#E8BCB7] bg-[#FFF3F1] text-sm text-[#8F403E]">
          {currentEntry.art.error}
        </Card>
      ) : null}

      <EntryForm mode="edit" existingEntry={currentEntry} />
    </AppShell>
  );
}
