export interface ProcessedImageResult {
  dataUrl: string;
  width: number;
  height: number;
}

export function measureImageUrlDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const natW = img.naturalWidth || img.width || 240;
      const natH = img.naturalHeight || img.height || 240;
      const displayScale = Math.min(1, 280 / Math.max(natW, natH));
      resolve({
        width: Math.max(60, Math.round(natW * displayScale)),
        height: Math.max(60, Math.round(natH * displayScale)),
      });
    };
    img.onerror = () => resolve({ width: 220, height: 220 });
    img.src = url;
  });
}

export function compressImageFile(file: File, maxDim = 1200): Promise<ProcessedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) {
        reject(new Error('Empty image data'));
        return;
      }

      const isGif = file.type === 'image/gif' || /\.gif$/i.test(file.name);
      const isWebp = file.type === 'image/webp' || /\.webp$/i.test(file.name);

      const img = new Image();
      img.onerror = () => resolve({ dataUrl, width: 240, height: 240 });
      img.onload = () => {
        const natW = img.naturalWidth || img.width || 240;
        const natH = img.naturalHeight || img.height || 240;

        // Compute clean canvas display size preserving exact original aspect ratio (max 280px side)
        const displayScale = Math.min(1, 280 / Math.max(natW, natH));
        const displayW = Math.max(60, Math.round(natW * displayScale));
        const displayH = Math.max(60, Math.round(natH * displayScale));

        // Always keep GIFs untouched so multi-frame animation is never flattened,
        // and keep lightweight files or WebP untouched to preserve transparency/animation
        if (isGif || isWebp || file.size <= 650 * 1024) {
          resolve({ dataUrl, width: displayW, height: displayH });
          return;
        }

        const scale = Math.min(1, maxDim / Math.max(natW, natH));
        const targetW = Math.max(1, Math.round(natW * scale));
        const targetH = Math.max(1, Math.round(natH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl, width: displayW, height: displayH });
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);

        // Use PNG for PNG files to preserve transparency, WebP for heavy photos
        const mime = file.type === 'image/png' ? 'image/png' : 'image/webp';
        const compressed = canvas.toDataURL(mime, 0.88);
        resolve({
          dataUrl: compressed.length < dataUrl.length ? compressed : dataUrl,
          width: displayW,
          height: displayH,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
