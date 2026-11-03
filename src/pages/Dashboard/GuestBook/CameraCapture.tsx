import { useState, useCallback, useEffect, useRef } from "react";
import { Image as ImageIcon, Loader2, ScanLine } from "lucide-react";

interface CameraCaptureProps {
  label: string;
  onCapture: (file: File) => void;
  capturedName?: string | null;
  isProcessing?: boolean;
  progress?: number;
}

export default function CameraCapture({
  label,
  onCapture,
  capturedName,
  isProcessing = false,
  progress = 0,
}: CameraCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  const startCamera = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setIsOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      setError("Tidak dapat mengakses kamera.");
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(
            new File([blob], `capture-${Date.now()}.jpg`, {
              type: "image/jpeg",
            })
          );
        }
        stopStream();
        setIsOpen(false);
      },
      "image/jpeg",
      0.95
    );
  };

  return (
    <div className="h-full">
      <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
        {label}
      </label>
      <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800 h-full flex flex-col justify-center">
        {isOpen ? (
          <div className="flex flex-col items-center gap-3">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full max-w-md rounded-lg bg-black"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={capture}
                className="px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
              >
                Ambil Foto
              </button>
              <button
                type="button"
                onClick={() => {
                  stopStream();
                  setIsOpen(false);
                }}
                className="px-5 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300"
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center gap-2">
            {isProcessing ? (
              <Loader2 className="text-brand-500 w-6 h-6 animate-spin" />
            ) : (
              <ImageIcon className="text-gray-400 w-6 h-6" />
            )}
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isProcessing ? "Memproses OCR..." : "Gunakan kamera untuk capture"}
            </p>
            {isProcessing && (
              <div className="mt-2 w-full max-w-[200px]">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span className="flex items-center gap-1">
                    <ScanLine className="w-3 h-3" /> OCR Progress
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                  <div
                    className="bg-brand-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={startCamera}
              disabled={isProcessing}
              className="mt-1 px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              Buka Kamera
            </button>
            {capturedName && !isProcessing && (
              <div className="mt-2 px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full truncate max-w-full dark:bg-green-900/30 dark:text-green-400">
                File: {capturedName}
              </div>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
