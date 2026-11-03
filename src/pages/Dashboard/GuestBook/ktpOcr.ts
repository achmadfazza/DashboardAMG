import Tesseract from "tesseract.js";

export interface ParsedKtp {
  nik: string;
  nama: string;
  alamat: string;
}

// Grayscale + binarize a canvas so Tesseract reads it much better
export function preprocessCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;

  // Grayscale
  const grays = new Float32Array(d.length / 4);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    grays[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  }

  // Otsu's method: pick the threshold that best separates dark text from the background
  const hist = new Uint32Array(256);
  for (let j = 0; j < grays.length; j++) hist[grays[j] | 0]++;
  const total = grays.length;
  let sumAll = 0;
  for (let t = 0; t < 256; t++) sumAll += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let maxVar = 0;
  let otsu = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sumAll - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);
    if (variance > maxVar) {
      maxVar = variance;
      otsu = t;
    }
  }

  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const v = grays[j] > otsu ? 255 : 0;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export async function preprocessKtpImage(
  file: File
): Promise<HTMLCanvasElement> {
  const img = await createImageBitmap(file);
  const scale = 3;
  const canvas = document.createElement("canvas");
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return preprocessCanvas(canvas);
}

export function parseKtpText(text: string): ParsedKtp {
  const result: ParsedKtp = { nik: "", nama: "", alamat: "" };

  const normalized = text.replace(/[ \t]+/g, " ");
  const lines = normalized
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Extract NIK (16 digits) — tolerate OCR reading it with spaces, dots or dashes
  const nikLine = lines.find((l) => /nik/i.test(l));
  const nikSource = nikLine
    ? nikLine + " " + (lines[lines.indexOf(nikLine) + 1] ?? "")
    : normalized;
  const nikCandidates = nikSource.match(/[\d][\d\s.-]{13,30}\d/g) || [];
  for (const cand of nikCandidates) {
    const digits = cand.replace(/\D/g, "");
    if (digits.length === 16) {
      result.nik = digits;
      break;
    }
  }
  if (!result.nik) {
    const fallback = normalized.replace(/\D/g, "").match(/\d{16}/);
    if (fallback) result.nik = fallback[0];
  }

  // Extract Nama — value may be on same line or next line after the label
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/n\s*a\s*m\s*a/i);
    if (m && m.index !== undefined) {
      let candidate = lines[i]
        .slice(m.index + m[0].length)
        .replace(/^[\s:.\-|]+/, "")
        .trim();
      if (!candidate && i + 1 < lines.length) {
        candidate = lines[i + 1];
      }
      result.nama = candidate;
      break;
    }
  }
  if (result.nama) {
    result.nama = result.nama
      .replace(/^[^A-Za-z]+/, "")
      .replace(/[^A-Za-z\s.'-].*$/, "")
      .trim()
      .toUpperCase();
  }

  // Fallback: "Nama" label often gets garbled — in KTP the Nama value
  // always follows the NIK line, so grab the first name-like line.
  if (!result.nama) {
    const nikIdx = lines.findIndex((l) => {
      const digits = l.replace(/\D/g, "");
      return /nik/i.test(l) || digits.length >= 16;
    });
    if (nikIdx !== -1) {
      for (let i = nikIdx + 1; i < Math.min(nikIdx + 4, lines.length); i++) {
        const candidate = lines[i]
          .replace(/^[^A-Za-z]+/, "")
          .replace(/^nama\b[:\s-]*/i, "")
          .replace(/[^A-Za-z\s.'-].*$/, "")
          .trim();
        if (
          candidate.length >= 3 &&
          /^[A-Za-z\s.'-]+$/.test(candidate) &&
          !/^(agama|pekerjaan|alamat|status|berlaku|jenis|tempat|provinsi|kabupaten|kewarganegaraan|nik|nama)/i.test(
            candidate
          )
        ) {
          result.nama = candidate.toUpperCase();
          break;
        }
      }
    }
  }

  // Extract Alamat
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^alamat\b[^:A-Za-z0-9]*[:\s-]*(.*)$/i);
    if (m) {
      result.alamat = m[1].trim();
      break;
    }
  }

  return result;
}

// Shared OCR worker: PSM 6 + character whitelist for KTP text
export async function createKtpWorker(
  onProgress?: (progress: number) => void
): Promise<Tesseract.Worker> {
  const worker = await Tesseract.createWorker("ind", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });
  await worker.setParameters({
    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
    tessedit_char_whitelist:
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 :/-.,'",
  });
  return worker;
}
