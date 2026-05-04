export async function compressImage(
  dataUrl: string,
  maxSize = 1024,
  quality = 0.82
): Promise<string> {
  const image = await loadImage(dataUrl);
  const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("浏览器不支持 Canvas 图片压缩。");

  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", clampQuality(quality));
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("截图图片加载失败。"));
    img.src = dataUrl;
  });
}

function clampQuality(quality: number): number {
  if (Number.isNaN(quality)) return 0.82;
  return Math.min(0.95, Math.max(0.35, quality));
}
