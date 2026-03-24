import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "meal-photos";

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i);
  }
  return new Blob([arr], { type: mime });
}

export async function uploadPhoto(
  supabase: SupabaseClient,
  userId: string,
  entryId: string,
  dataUrl: string
): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const path = `${userId}/${entryId}-photo.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadArt(
  supabase: SupabaseClient,
  userId: string,
  entryId: string,
  dataUrl: string
): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const path = `${userId}/${entryId}-art.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteEntryPhotos(
  supabase: SupabaseClient,
  userId: string,
  entryId: string
): Promise<void> {
  await supabase.storage
    .from(BUCKET)
    .remove([`${userId}/${entryId}-photo.jpg`, `${userId}/${entryId}-art.jpg`]);
}
