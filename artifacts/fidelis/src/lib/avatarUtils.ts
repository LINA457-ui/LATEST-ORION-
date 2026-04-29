// Resize a user-supplied image to a small square avatar (256x256 JPEG ~85%
// quality) so the resulting data URL stays well under our server-side cap.
export async function resizeAvatar(
  file: File,
  size = 256,
  quality = 0.85,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file.");
  }
  const bitmap = await createImageBitmap(file);
  const minDim = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - minDim) / 2;
  const sy = (bitmap.height - minDim) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image processing not supported in this browser.");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(bitmap, sx, sy, minDim, minDim, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", quality);
}
