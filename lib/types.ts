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

export type ArtJobInput = {
  entryId: string;
  userId: string;
  sourcePath: string;
  promptVersion: string;
  styleVersion: string;
};

export type ArtJobResult = {
  artPath: string;
  thumb256Path: string;
  thumb64Path: string;
  provider: string;
  model: string;
  metadata?: Record<string, unknown>;
};

export type EntryArt = {
  status: ArtStatus;
  promptVersion: string;
  styleVersion: string;
  palette: [string, string, string];
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

