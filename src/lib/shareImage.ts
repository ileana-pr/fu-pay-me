import QRCode from 'qrcode';

const MAX_BYTES = 1_000_000;
const BG_LIGHT = '#FFFBF2';
const FG_LIGHT = '#2D0A00';
const BG_DARK = '#1a1a1a';
const FG_DARK = '#ffffff';
const ACCENT = '#14B8A6'; // piri menta (brand)
const JPEG_QUALITY_DEFAULT = 0.92;

export type ShareImageTheme = 'light' | 'dark';
// layout tuned at 1080; other sizes scale proportionally
const BASE = 1080;
const MASCOT_URL = '/logo/piri.png';
const FONT_DISPLAY = 'Fredoka One';
const FONT_BODY = 'Nunito';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('failed to load qr image'));
    img.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('could not create image blob'));
        else resolve(blob);
      },
      type,
      quality
    );
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** presets users pick before format; smaller = smaller files, still scannable */
export const SHARE_IMAGE_PRESETS = [
  { id: '1080', size: 1080, label: '1080 × 1080', hint: 'social / high quality' },
  { id: '1024', size: 1024, label: '1024 × 1024', hint: 'Decentraland-friendly (power of two)' },
  { id: '768', size: 768, label: '768 × 768', hint: 'balanced' },
  { id: '512', size: 512, label: '512 × 512', hint: 'smallest file' },
] as const;

export type ShareImagePresetId = (typeof SHARE_IMAGE_PRESETS)[number]['id'];

function scale(size: number, n: number) {
  return Math.max(1, Math.round((n * size) / BASE));
}

async function buildShareCanvas(tipUrl: string, size: number, theme: ShareImageTheme): Promise<HTMLCanvasElement> {
  // qr always black-on-white for scanability
  const qrDataUrl = await QRCode.toDataURL(tipUrl, {
    width: Math.floor(size * 0.62),
    margin: 2,
    color: { dark: '#2D0A00', light: '#ffffff' },
  });
  const qrImg = await loadImage(qrDataUrl);
  let mascotImg: HTMLImageElement | null = null;
  try {
    mascotImg = await loadImage(MASCOT_URL);
  } catch {
    // mascot optional; layout still works without it
  }

  const isDark = theme === 'dark';
  const bg = isDark ? BG_DARK : BG_LIGHT;
  const fg = isDark ? FG_DARK : FG_LIGHT;
  const borderStroke = isDark ? 'rgba(255, 255, 255, 0.25)' : `${ACCENT}40`;
  const taglineFill = isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(45, 10, 0, 0.75)';
  const footerFill = isDark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(45, 10, 0, 0.6)';
  const qrCardStroke = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(45, 10, 0, 0.12)';

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas not supported');

  const inset = scale(size, 14);
  const lineWide = scale(size, 4);
  const titleSize = Math.max(22, scale(size, 50));
  const taglineSize = Math.max(14, scale(size, 32));
  const footerSize = Math.max(12, scale(size, 26));
  const pad = scale(size, 28);
  const r = scale(size, 20);
  const strokeNarrow = Math.max(1, scale(size, 2));
  const mascotSize = scale(size, 140);

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = borderStroke;
  ctx.lineWidth = lineWide;
  ctx.strokeRect(inset, inset, size - inset * 2, size - inset * 2);

  let y = scale(size, 70);

  if (mascotImg) {
    const mascotX = (size - mascotSize) / 2;
    ctx.drawImage(mascotImg, mascotX, y, mascotSize, mascotSize);
    y += mascotSize + scale(size, 48);
  }

  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.font = `bold ${titleSize}px "${FONT_DISPLAY}", cursive`;
  ctx.fillText('Piri', size / 2, y);
  y += titleSize + scale(size, 42);

  ctx.fillStyle = taglineFill;
  ctx.font = `600 ${taglineSize}px "${FONT_BODY}", sans-serif`;
  ctx.fillText('Scan to send us a tip', size / 2, y);
  y += scale(size, 46);

  const qrDrawSize = Math.floor(size * 0.44);
  const qrX = (size - qrDrawSize) / 2;
  const qrY = y;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  const x0 = qrX - pad;
  const y0 = qrY - pad;
  const w = qrDrawSize + pad * 2;
  const h = qrDrawSize + pad * 2;
  ctx.roundRect(x0, y0, w, h, r);
  ctx.fill();
  ctx.strokeStyle = qrCardStroke;
  ctx.lineWidth = strokeNarrow;
  ctx.stroke();
  ctx.drawImage(qrImg, qrX, qrY, qrDrawSize, qrDrawSize);

  ctx.fillStyle = footerFill;
  ctx.font = `600 ${footerSize}px "${FONT_BODY}", sans-serif`;
  ctx.fillText('One scan, every flavor', size / 2, size - scale(size, 48));

  return canvas;
}

async function jpegBlobUnderCap(canvas: HTMLCanvasElement): Promise<Blob> {
  let blob = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY_DEFAULT);
  if (blob.size <= MAX_BYTES) return blob;
  const qualities = [0.88, 0.85, 0.82, 0.78, 0.72];
  for (const q of qualities) {
    blob = await canvasToBlob(canvas, 'image/jpeg', q);
    if (blob.size <= MAX_BYTES) return blob;
  }
  return blob;
}

export type ShareImageVariant = {
  blob: Blob;
  bytes: number;
  filename: string;
  overRecommendedMax: boolean;
};

export type ShareImageExport = {
  dimension: number;
  theme: ShareImageTheme;
  png: ShareImageVariant;
  jpeg: ShareImageVariant;
};

/**
 * build at chosen dimension and theme; png + jpeg with sizes for ui.
 */
export async function prepareShareImageExport(
  tipUrl: string,
  dimension: number,
  theme: ShareImageTheme = 'light'
): Promise<ShareImageExport> {
  const canvas = await buildShareCanvas(tipUrl, dimension, theme);
  const pngBlob = await canvasToBlob(canvas, 'image/png');
  const jpegBlob = await jpegBlobUnderCap(canvas);
  const themeSuffix = theme === 'dark' ? '-dark' : '';
  const suffix = `${themeSuffix}-${dimension}`;

  return {
    dimension,
    theme,
    png: {
      blob: pngBlob,
      bytes: pngBlob.size,
      filename: `piri-qr${suffix}.png`,
      overRecommendedMax: pngBlob.size > MAX_BYTES,
    },
    jpeg: {
      blob: jpegBlob,
      bytes: jpegBlob.size,
      filename: `piri-qr${suffix}.jpg`,
      overRecommendedMax: jpegBlob.size > MAX_BYTES,
    },
  };
}

export function downloadShareBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** one-click: walk presets until jpeg under 1mb, else download smallest jpeg anyway */
export async function downloadPiriShareImage(tipUrl: string, theme: ShareImageTheme = 'light') {
  for (let i = 0; i < SHARE_IMAGE_PRESETS.length; i++) {
    const { size } = SHARE_IMAGE_PRESETS[i];
    const exp = await prepareShareImageExport(tipUrl, size, theme);
    if (!exp.jpeg.overRecommendedMax) {
      downloadShareBlob(exp.jpeg.blob, exp.jpeg.filename);
      return;
    }
  }
  const smallest = SHARE_IMAGE_PRESETS[SHARE_IMAGE_PRESETS.length - 1];
  const exp = await prepareShareImageExport(tipUrl, smallest.size, theme);
  downloadShareBlob(exp.jpeg.blob, exp.jpeg.filename);
}
