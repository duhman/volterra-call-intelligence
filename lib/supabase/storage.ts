import { createServiceClient } from "./server";

const RECORDINGS_BUCKET = "call_intelligence_call_recordings";

export async function uploadRecording(
  conversationId: string,
  audioBuffer: Buffer,
  filename: string,
) {
  const supabase = await createServiceClient();

  const path = `${conversationId}/${filename}`;

  const { data, error } = await supabase.storage
    .from(RECORDINGS_BUCKET)
    .upload(path, audioBuffer, {
      contentType: "audio/mp3",
    });

  if (error) {
    throw new Error(`Failed to upload recording: ${error.message}`);
  }

  return data.path;
}

/**
 * Upload recording from a remote URL to Supabase Storage
 * Downloads the audio file and stores it in the call_recordings bucket
 * @param headers Optional headers to include in the fetch request (e.g., Authorization)
 */
export async function uploadRecordingFromUrl(
  remoteUrl: string,
  storagePath: string,
  headers?: Record<string, string>,
): Promise<string> {
  const supabase = await createServiceClient();

  // Fetch the audio file from remote URL with optional headers
  const response = await fetch(remoteUrl, {
    headers: headers,
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch recording from ${remoteUrl}: ${response.status} ${response.statusText}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(RECORDINGS_BUCKET)
    .upload(storagePath, audioBuffer, {
      contentType: "audio/mp3",
      upsert: true, // Overwrite if exists
    });

  if (error) {
    throw new Error(`Failed to upload recording to storage: ${error.message}`);
  }

  return data.path;
}

/**
 * Generate a signed URL for a recording with default 1 hour expiration
 * Used for providing ElevenLabs with a publicly accessible URL
 */
export async function getSignedRecordingUrl(
  storagePath: string,
  expiresIn: number = 3600,
): Promise<string> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase.storage
    .from(RECORDINGS_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

export async function getRecordingUrl(path: string, expiresIn: number = 3600) {
  const supabase = await createServiceClient();

  const { data, error } = await supabase.storage
    .from(RECORDINGS_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

export async function deleteRecording(path: string) {
  const supabase = await createServiceClient();

  const { error } = await supabase.storage
    .from(RECORDINGS_BUCKET)
    .remove([path]);

  if (error) {
    throw new Error(`Failed to delete recording: ${error.message}`);
  }
}
