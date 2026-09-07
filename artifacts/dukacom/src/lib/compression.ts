import imageCompression from "browser-image-compression";

const compressionOptions = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1280,
  useWebWorker: true,
  fileType: "image/webp",
};

export async function compressImage(file: File): Promise<File> {
  if (file.size < 200 * 1024) {
    // Skip compression for small files < 200KB
    return file;
  }
  try {
    const compressed = await imageCompression(file, compressionOptions);
    return compressed;
  } catch (err) {
    console.warn("Compression failed, using original:", err);
    return file;
  }
}
