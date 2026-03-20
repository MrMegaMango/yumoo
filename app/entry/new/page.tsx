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
      subtitle="What's the vibe today? Snap the food that matches your energy."
      showFab={false}
    >
      <EntryForm mode="create" defaultLocalDate={defaultLocalDate} />
    </AppShell>
  );
}
