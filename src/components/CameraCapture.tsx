import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Video, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhotoMode } from "@/types/photo-mode";

interface CameraCaptureProps {
  mode: PhotoMode;
  photoCount?: number;
  onBack: () => void;
}

export const CameraCapture = ({ mode, photoCount = 1, onBack }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    getCameras();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (selectedCamera) {
      startCamera(selectedCamera);
    }
  }, [selectedCamera]);

  const getCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameras(videoDevices);
      if (videoDevices.length > 0) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Error getting cameras:', error);
      toast.error('לא ניתן לקבל רשימת מצלמות');
    }
  };

  const startCamera = async (deviceId?: string) => {
    try {
      console.log('Requesting camera access...');
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      const constraints: MediaStreamConstraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Camera access granted', mediaStream);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        console.log('Video playing');
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('לא ניתן לגשת למצלמה');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg');
      
      if (mode === 'burst') {
        setCapturedImages(prev => [...prev, imageData]);
        setCurrentPhotoIndex(prev => prev + 1);
        
        if (capturedImages.length + 1 >= photoCount) {
          toast.success(`כל התמונות נצלמו! (${photoCount})`);
        } else {
          toast.info(`תמונה ${capturedImages.length + 1}/${photoCount}`);
        }
      } else {
        setCapturedImages([imageData]);
      }
    }
  };

  const startRecording = () => {
    if (!stream) return;

    recordedChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9'
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunksRef.current, {
        type: 'video/webm'
      });
      
      const url = URL.createObjectURL(blob);
      setCapturedImages([url]);
      setIsRecording(false);
      toast.success('הוידאו נוצר! 🎬');
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);

    // Stop recording after 3 seconds for GIF mode
    if (mode === 'gif') {
      setTimeout(() => {
        mediaRecorder.stop();
      }, 3000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const processImages = async () => {
    if (capturedImages.length === 0) return;
    
    setIsProcessing(true);
    try {
      if (mode === 'video') {
        const { data, error } = await supabase.functions.invoke('create-ai-video', {
          body: { imageData: capturedImages[0] }
        });

        if (error) throw error;

        if (data.videoUrl) {
          setEditedImage(data.videoUrl);
          toast.success('הסרטון נוצר! ✨');
        }
      } else {
        const { data, error } = await supabase.functions.invoke('add-beer', {
          body: { imageData: capturedImages[0] }
        });

        if (error) throw error;

        if (data.editedImageUrl) {
          setEditedImage(data.editedImageUrl);
          toast.success('הבירה נוספה! 🍺');
        }
      }
    } catch (error) {
      console.error('Error processing:', error);
      toast.error('שגיאה בעיבוד. נסה שוב.');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setCapturedImages([]);
    setEditedImage(null);
    setCurrentPhotoIndex(0);
    startCamera(selectedCamera);
  };

  const getModeTitle = () => {
    switch (mode) {
      case 'single': return '🍺 Beer Selfie';
      case 'burst': return '📸 סדרת תמונות';
      case 'gif': return '🎬 GIF';
      case 'video': return '✨ סרטון קסם';
      default: return 'Beer Buddy';
    }
  };

  const getModeDescription = () => {
    switch (mode) {
      case 'single': return 'צלם תמונה ואנחנו נוסיף לך בירה!';
      case 'burst': return `צלם ${photoCount} תמונות ברצף`;
      case 'gif': return 'הקלט וידאו קצר בלופ (3 שניות)';
      case 'video': return 'צור סרטון קסם עם AI';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" onClick={onBack}>
            <ArrowRight className="ml-2" />
            חזור
          </Button>
          <h1 className="text-4xl font-bold text-center text-primary flex-1">
            {getModeTitle()}
          </h1>
          <div className="w-24" />
        </div>
        <p className="text-center text-muted-foreground mb-6">
          {getModeDescription()}
        </p>

        {capturedImages.length === 0 && cameras.length > 0 && (
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Video className="w-4 h-4" />
              בחר מצלמה
            </label>
            <Select value={selectedCamera} onValueChange={setSelectedCamera}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="בחר מצלמה" />
              </SelectTrigger>
              <SelectContent>
                {cameras.filter(camera => camera.deviceId).map((camera) => (
                  <SelectItem key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || `מצלמה ${camera.deviceId.slice(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {mode === 'burst' && capturedImages.length > 0 && capturedImages.length < photoCount && (
          <div className="mb-4 p-4 bg-primary/10 rounded-lg text-center">
            <p className="text-lg font-semibold">
              תמונה {capturedImages.length}/{photoCount}
            </p>
            <p className="text-sm text-muted-foreground">
              לחץ על הכפתור לצילום הבא
            </p>
          </div>
        )}

        {capturedImages.length === 0 ? (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg shadow-lg"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {mode === 'gif' && !isRecording && (
              <Button
                onClick={startRecording}
                size="lg"
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-primary hover:bg-primary/90"
              >
                <Camera className="mr-2" />
                התחל הקלטה (3 שניות)
              </Button>
            )}
            {mode === 'gif' && isRecording && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full font-semibold animate-pulse">
                מקליט...
              </div>
            )}
            {(mode === 'single' || mode === 'burst') && (
              <Button
                onClick={capturePhoto}
                size="lg"
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-primary hover:bg-primary/90"
                disabled={mode === 'burst' && capturedImages.length >= photoCount}
              >
                <Camera className="mr-2" />
                {mode === 'burst' && capturedImages.length > 0 
                  ? `צלם תמונה ${capturedImages.length + 1}/${photoCount}`
                  : 'צלם תמונה'
                }
              </Button>
            )}
          </div>
        ) : mode === 'gif' ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">הוידאו שלך 🎬</h3>
              <video
                src={capturedImages[0]}
                controls
                loop
                autoPlay
                className="w-full rounded-lg shadow-lg"
              />
            </div>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={reset}
                variant="outline"
                size="lg"
              >
                נסה שוב
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {mode === 'burst' && capturedImages.length < photoCount ? (
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg shadow-lg"
                />
                <Button
                  onClick={capturePhoto}
                  size="lg"
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-primary hover:bg-primary/90"
                >
                  <Camera className="mr-2" />
                  צלם תמונה {capturedImages.length + 1}/{photoCount}
                </Button>
                <div className="absolute top-4 left-4 flex gap-2">
                  {capturedImages.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Captured ${idx + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border-2 border-white shadow-lg"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {capturedImages.length === 1 ? (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">התמונה המקורית</h3>
                      <img
                        src={capturedImages[0]}
                        alt="Captured"
                        className="w-full rounded-lg shadow-lg"
                      />
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">התמונות שלך</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {capturedImages.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Captured ${idx + 1}`}
                            className="w-full rounded-lg shadow-lg"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {editedImage && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        {mode === 'video' ? 'הסרטון שלך ✨' : 'עם בירה 🍺'}
                      </h3>
                      {mode === 'video' ? (
                        <video
                          src={editedImage}
                          controls
                          loop
                          className="w-full rounded-lg shadow-lg"
                        />
                      ) : (
                        <img
                          src={editedImage}
                          alt="Edited"
                          className="w-full rounded-lg shadow-lg"
                        />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-4 justify-center">
                  {!editedImage && (
                    <Button
                      onClick={processImages}
                      disabled={isProcessing}
                      size="lg"
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isProcessing ? "מעבד..." : 
                       mode === 'video' ? "צור סרטון קסם ✨" :
                       "הוסף בירה 🍺"}
                    </Button>
                  )}
                  
                  <Button
                    onClick={reset}
                    variant="outline"
                    size="lg"
                  >
                    נסה שוב
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
