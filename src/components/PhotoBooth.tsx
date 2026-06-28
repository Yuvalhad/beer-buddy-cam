import { useRef, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Countdown } from "./Countdown";
import { CameraFlash } from "./CameraFlash";
import { OWNER_EMAIL, DEFAULT_THEME, THEMES } from "@/config/booth";
import { Loader2, RotateCcw } from "lucide-react";

type View = "camera" | "processing" | "result";

export const PhotoBooth = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [view, setView] = useState<View>("camera");
  const [theme, setTheme] = useState<string>(DEFAULT_THEME);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch (error) {
      console.error("Camera error:", error);
      const name = error instanceof Error ? error.name : "";
      if (name === "NotAllowedError") toast.error("נא לאפשר גישה למצלמה בהגדרות הדפדפן");
      else if (name === "NotFoundError") toast.error("לא נמצאה מצלמה במכשיר");
      else if (name === "NotReadableError") toast.error("המצלמה בשימוש באפליקציה אחרת");
      else toast.error("לא ניתן לגשת למצלמה");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera]);

  // Big red button → start the 3s countdown.
  const handleShutter = () => {
    if (!cameraReady) return;
    setShowCountdown(true);
  };

  const onCountdownComplete = () => {
    setShowCountdown(false);
    setShowFlash(true);
  };

  const onFlashComplete = () => {
    setShowFlash(false);
    capture();
  };

  const capture = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg", 0.92);

    setCapturedImage(imageData);
    setAiImage(null);
    setView("processing");

    const startedAt = performance.now();
    try {
      const { data, error } = await supabase.functions.invoke("photo-booth", {
        body: { imageData, email: OWNER_EMAIL, theme },
      });
      if (error) throw error;
      if (!data?.aiUrl) throw new Error("No AI image returned");

      setAiImage(data.aiUrl);
      setView("result");
      const seconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      toast.success(`מוכן ב-${seconds} שניות! נשלח למייל 📧`);
    } catch (err) {
      console.error("Processing error:", err);
      toast.error("שגיאה ביצירת התמונה. נסו שוב.");
      setView("camera");
    }
  };

  const reset = () => {
    setCapturedImage(null);
    setAiImage(null);
    setView("camera");
  };

  const activeTheme = THEMES.find((t) => t.key === theme) ?? THEMES[0];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black text-white">
      {showCountdown && <Countdown onComplete={onCountdownComplete} />}
      {showFlash && <CameraFlash show={showFlash} onComplete={onFlashComplete} />}

      {/* Live camera (always mounted so the stream stays warm) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
          view === "camera" ? "opacity-100" : "opacity-0"
        }`}
        style={{ transform: "scaleX(-1)" }}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* CAMERA VIEW */}
      {view === "camera" && (
        <div className="absolute inset-0 flex flex-col">
          <div className="flex items-center justify-center gap-2 p-4">
            {THEMES.map((t) => (
              <button
                key={t.key}
                onClick={() => setTheme(t.key)}
                className={`rounded-full px-4 py-2 text-sm font-bold backdrop-blur transition ${
                  theme === t.key
                    ? "bg-white text-black"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <div className="flex flex-col items-center gap-4 pb-12">
            <p className="text-lg font-medium drop-shadow-lg">לחצו על הכפתור והתכוננו! 📸</p>
            <button
              onClick={handleShutter}
              aria-label="צלם"
              className="group relative flex h-28 w-28 items-center justify-center rounded-full bg-red-600 shadow-[0_0_40px_rgba(220,38,38,0.7)] transition active:scale-95 disabled:opacity-50"
              disabled={!cameraReady}
            >
              <span className="absolute inset-2 rounded-full border-4 border-white/90" />
              <span className="absolute inset-4 rounded-full bg-red-500 transition group-hover:bg-red-400" />
            </button>
          </div>
        </div>
      )}

      {/* PROCESSING VIEW */}
      {view === "processing" && capturedImage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
          <img
            src={capturedImage}
            alt="captured"
            className="absolute inset-0 h-full w-full object-cover opacity-40"
            style={{ transform: "scaleX(-1)" }}
          />
          <div className="z-10 flex flex-col items-center gap-4 rounded-3xl bg-black/60 px-10 py-8 backdrop-blur">
            <Loader2 className="h-14 w-14 animate-spin text-red-500" />
            <p className="text-2xl font-bold">יוצרים את הקסם...</p>
            <p className="text-white/70">{activeTheme.emoji} {activeTheme.label}</p>
          </div>
        </div>
      )}

      {/* RESULT VIEW */}
      {view === "result" && aiImage && (
        <div className="absolute inset-0 flex flex-col items-center bg-black p-4">
          <h2 className="my-3 text-2xl font-bold">הנה התוצאה! 🎉</h2>
          <div className="flex w-full max-w-3xl flex-1 items-center justify-center">
            <img src={aiImage} alt="AI result" className="max-h-[70vh] w-auto rounded-2xl shadow-2xl" />
          </div>
          {capturedImage && (
            <img
              src={capturedImage}
              alt="original"
              className="mt-3 h-20 w-20 rounded-lg border-2 border-white/40 object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
          )}
          <button
            onClick={reset}
            className="my-5 flex items-center gap-2 rounded-full bg-red-600 px-10 py-4 text-xl font-bold shadow-lg transition active:scale-95"
          >
            <RotateCcw className="h-6 w-6" />
            צילום נוסף
          </button>
        </div>
      )}
    </div>
  );
};
