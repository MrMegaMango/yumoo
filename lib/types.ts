export const mealTypes = [
  "🥬 Go Green",
  "🍰 Sweet Treat",
  "🏡 Homemade",
  "🔥 Street Food",
  "✨ Bougie Bite"
] as const;

export type MealType = (typeof mealTypes)[number] | (string & {});

export const moods = ["😋", "🫠", "😮‍💨", "😍", "🥱"] as const;
export type Mood = (typeof moods)[number] | (string & {});

export type ArtStatus = "queued" | "ready" | "failed";
export type DiarySyncState =
  | "local"
  | "connecting"
  | "syncing"
  | "synced"
  | "error";

export type ArtJobInput = {
  entryId: string;
  userId: string;
  photoDataUrl: string;
  caption: string;
  mood?: Mood;
  mealType?: MealType;
  promptVersion: string;
  styleVersion: string;
};

export type ArtJobResult = {
  imageDataUrl: string;
  provider: string;
  model: string;
  metadata?: Record<string, unknown>;
  creditsRemaining?: number;
  lifetimeAccess?: boolean;
};

export type EntryArt = {
  jobId: string;
  status: ArtStatus;
  promptVersion: string;
  styleVersion: string;
  palette: [string, string, string];
  imageDataUrl?: string;
  provider?: string;
  model?: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  error?: string;
};

export type MealEntry = {
  id: string;
  userId: string;
  caption: string;
  mood?: Mood;
  mealType?: MealType;
  takenAt: string;
  localDate: string;
  photoDataUrl: string;
  createdAt: string;
  updatedAt: string;
  art: EntryArt;
};

export type DiaryStore = {
  version: 1;
  guestId: string;
  entries: MealEntry[];
};

export type SaveEntryInput = {
  caption: string;
  mood?: Mood;
  mealType?: MealType;
  takenAt: string;
  photoFile?: File | null;
  photoDataUrl?: string;
};
