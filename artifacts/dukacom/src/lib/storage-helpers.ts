import { compressImage } from "./compression";

const CLOUDINARY_UPLOAD_URL =
  "https://api.cloudinary.com/v1_1/rf1xkwka/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "ml_default";

export async function uploadToCloudinary(file: File, publicId?: string): Promise<string> {
  const compressed = await compressImage(file);
  const formData = new FormData();
  formData.append("file", compressed);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  if (publicId) {
    formData.append("public_id", publicId.replace(/\.[^/.]+$/, ""));
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.secure_url) {
      const message =
        payload?.error?.message || `Cloudinary a répondu avec le statut ${response.status}.`;
      throw new Error(message);
    }

    return payload.secure_url as string;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("L'upload Cloudinary a dépassé 30 secondes.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function uploadImage(
  file: File,
  path: string
): Promise<string> {
  return uploadToCloudinary(file, path);
}

export async function uploadFile(file: File, path: string): Promise<string> {
  return uploadToCloudinary(file, path);
}

export async function deleteFile(url: string): Promise<void> {
  // La suppression Cloudinary nécessite une signature générée côté serveur.
  // Les anciens fichiers restent donc conservés lors du remplacement d'une image.
  void url;
}
