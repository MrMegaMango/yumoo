"use client";

import { use } from "react";

import { AppShell } from "@/components/app-shell";
import { EntryForm } from "@/components/entry-form";

export default function NewEntryPage({
  searchParams
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const resolvedSearchParams = use(searchParams);
  const defaultLocalDate = resolvedSearchParams.date ?? undefined;

  return (
    <AppShell
      title="Add a meal"
      subtitle="Snap a photo, pick your mood, and let the calendar fill in."
      showFab={false}
    >
      <EntryForm mode="create" defaultLocalDate={defaultLocalDate} />
    </AppShell>
  );
}
