import { useState, useCallback, useEffect, useRef } from "react";
import { ScanLine } from "lucide-react";
import {
  createKtpWorker,
  parseKtpText,
  preprocessCanvas,
  type ParsedKtp,
} from "./ktpOcr";

interface KtpScanProps {
  onResult: (file: File, parsed: ParsedKtp) => void;
}

// Single-shot scan: capture one stable frame and run OCR once
export default function KtpScan({ onResult }: KtpScanProps) {
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Awaited<ReturnType<typeof createKtpWorker>> | null>(
    null
  );
  const busyRef = useRef(false);

  const stopAll = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  const startCamera = async () => {
    try {
      setStatus("Menyiapkan kamera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setScanning(true);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
      setStatus("Arahkan KTP ke kamera, lalu tekan Ambil Foto & Scan.");
    } catch {
      setStatus("Tidak dapat mengakses kamera.");
      stopAll();
    }
  };

  const captureAndScan = async () => {
    const video = videoRef.current;
    if (!video || busyRef.current) return;
    if (video.videoWidth === 0) return;
    busyRef.current = true;
    setStatus("Memproses foto...");

    try {
      const canvas = document.createElement("canvas");
      const scale = 3;
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const processed = preprocessCanvas(canvas);

      // Stop the camera as soon as we have the frame
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setScanning(false);

      workerRef.current = await createKtpWorker((p) =>
        setStatus(`Membaca teks... ${p}%`)
      );

      const result = await workerRef.current.recognize(processed);
      const text = result.data.text;
      console.log("Single-shot OCR:", text);
      const parsed = parseKtpText(text);
      console.log("Parsed KTP:", parsed);

      if (!parsed.nik && !parsed.nama) {
        setStatus("Teks tidak terbaca. Coba lagi dengan foto lebih jelas.");
      } else {
        processed.toBlob(
          (blob) => {
            if (blob) {
              onResult(
                new File([blob], `ktp-scan-${Date.now()}.jpg`, {
                  type: "image/jpeg",
                }),
                parsed
              );
            }
          },
          "image/jpeg",
          0.95
        );
        setStatus(
          parsed.nik
            ? `Berhasil! NIK: ${parsed.nik}`
            : "Sebagian data terbaca. Periksa hasilnya."
        );
      }
    } catch (err) {
      console.error("Scan error:", err);
      setStatus("Gagal memproses foto.");
    } finally {
      busyRef.current = false;
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    }
  };

  return (
    <div className="h-full">
      <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
        Scan KTP (Single-Shot)
      </label>
      <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800 h-full flex flex-col justify-center">
        {scanning ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-full max-w-md overflow-hidden rounded-lg">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full bg-black"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{status}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 italic">
              Tip: isi bingkai dengan kartu KTP — dekatkan kartu sampai teks
              memenuhi layar, dan pastikan pencahayaan cukup.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={captureAndScan}
                className="px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
              >
                Ambil Foto & Scan
              </button>
              <button
                type="button"
                onClick={() => {
                  stopAll();
                  setStatus("Scan dihentikan.");
                }}
                className="px-5 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300"
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-2">
            <ScanLine className="text-gray-400 w-6 h-6" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Ambil satu foto KTP, lalu baca NIK & Nama dengan OCR
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 italic">
              Tip: dekatkan kartu sampai teks KTP memenuhi bingkai.
            </p>
            <button
              type="button"
              onClick={startCamera}
              className="mt-1 px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
            >
              Buka Kamera
            </button>
            {status && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {status}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
