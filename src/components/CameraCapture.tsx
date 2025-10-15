import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const CameraCapture = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      console.log('Requesting camera access...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      console.log('Camera access granted', mediaStream);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        console.log('Video playing');
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('לא ניתן לגשת למצלמה. אנא אפשר גישה למצלמה בהגדרות הדפדפן.');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageData);
        setEditedImage(null);
        
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
    }
  };

  const addBeer = async () => {
    if (!capturedImage) return;
    
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('add-beer', {
        body: { imageData: capturedImage }
      });

      if (error) throw error;
      
      if (data.editedImageUrl) {
        setEditedImage(data.editedImageUrl);
        toast.success('🍺 הבירה נוספה בהצלחה!');
      }
    } catch (error) {
      console.error('Error adding beer:', error);
      toast.error('אופס! משהו השתבש. נסה שוב.');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setCapturedImage(null);
    setEditedImage(null);
    startCamera();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl p-8 shadow-[var(--shadow-glow)] backdrop-blur-sm bg-card/95">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-3 animate-pulse">
            🍺 Beer Selfie
          </h1>
          <p className="text-muted-foreground text-lg">צלם את עצמך וקבל בירה קרה ביד! 🎉</p>
        </div>

        <div className="space-y-6">
          {!capturedImage ? (
            <div className="relative bg-muted rounded-2xl overflow-hidden min-h-[400px] flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-2xl shadow-lg"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              <Button
                onClick={capturePhoto}
                size="lg"
                className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-accent hover:shadow-[var(--shadow-glow)] transition-all duration-300 hover:scale-110 text-lg px-8"
              >
                <Camera className="mr-2 h-6 w-6" />
                צלם תמונה
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-center">התמונה המקורית</h3>
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="w-full rounded-2xl shadow-lg"
                  />
                </div>
                
                {editedImage && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-center">עם הבירה! 🍺</h3>
                    <img
                      src={editedImage}
                      alt="With beer"
                      className="w-full rounded-2xl shadow-lg ring-4 ring-primary/50"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-4 justify-center">
                {!editedImage && (
                  <Button
                    onClick={addBeer}
                    disabled={isProcessing}
                    size="lg"
                    className="bg-gradient-to-r from-primary to-accent hover:shadow-[var(--shadow-glow)] transition-all duration-300 hover:scale-110 text-lg px-8"
                  >
                    {isProcessing ? (
                      <>
                        <Sparkles className="mr-2 h-6 w-6 animate-spin" />
                        מוסיף בירה...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-6 w-6" />
                        הוסף לי בירה! 🍺
                      </>
                    )}
                  </Button>
                )}
                
                <Button
                  onClick={reset}
                  variant="outline"
                  size="lg"
                  className="border-2 hover:bg-secondary/50 text-lg px-8"
                >
                  <RotateCcw className="mr-2 h-5 w-5" />
                  נסה שוב
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
