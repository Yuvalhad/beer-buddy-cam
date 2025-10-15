import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Video, ArrowRight, RefreshCw } from "lucide-react";
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
import { Countdown } from "./Countdown";
import { CameraFlash } from "./CameraFlash";
import { ShareDialog } from "./ShareDialog";

interface CameraCaptureProps {
  mode: PhotoMode;
  photoCount?: number;
  onBack: () => void;
  onReset?: () => void;
}

export const CameraCapture = ({ mode, photoCount = 1, onBack, onReset }: CameraCaptureProps) => {
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
  const [showCountdown, setShowCountdown] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareFileUrl, setShareFileUrl] = useState<string>("");

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
      console.log('🎥 Searching for cameras...');
      
      // First, request camera access to get permissions
      // This is required for enumerateDevices to return full device info
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        console.log('✅ Camera permission granted');
        // Stop the temporary stream immediately
        tempStream.getTracks().forEach(track => track.stop());
      } catch (permError) {
        console.warn('⚠️ Camera permission not granted yet:', permError);
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log('📹 Cameras found:', videoDevices.length);
      videoDevices.forEach((device, index) => {
        console.log(`  Camera ${index + 1}: ${device.label || 'Unknown'} (ID: ${device.deviceId.slice(0, 12)}...)`);
      });
      
      setCameras(videoDevices);
      if (videoDevices.length > 0) {
        setSelectedCamera(videoDevices[0].deviceId);
        console.log('✅ Default camera selected:', videoDevices[0].label || 'Camera 1');
      } else {
        console.warn('⚠️ No cameras found on this device');
        toast.error('לא נמצאו מצלמות במכשיר');
      }
    } catch (error) {
      console.error('❌ Error getting cameras:', error);
      toast.error('לא ניתן לקבל רשימת מצלמות');
    }
  };

  const startCamera = async (deviceId?: string) => {
    try {
      console.log('🎥 Requesting camera access...', deviceId);
      
      if (stream) {
        console.log('🔴 Stopping existing stream');
        stream.getTracks().forEach(track => track.stop());
      }
      
      const constraints: MediaStreamConstraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      };
      
      console.log('📋 Camera constraints:', constraints);
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Camera access granted!');
      console.log('📊 Stream details:', {
        active: mediaStream.active,
        id: mediaStream.id,
        tracks: mediaStream.getTracks().length
      });
      
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        console.log('🎬 Video track settings:', {
          label: videoTrack.label,
          width: settings.width,
          height: settings.height,
          frameRate: settings.frameRate,
          facingMode: settings.facingMode
        });
      }
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        console.log('▶️ Video playing successfully');
        console.log('✅ Camera is CONNECTED and WORKING!');
      }
    } catch (error: any) {
      console.error('❌ Error accessing camera:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      
      if (error.name === 'NotAllowedError') {
        toast.error('נא לאפשר גישה למצלמה בהגדרות הדפדפן');
      } else if (error.name === 'NotFoundError') {
        toast.error('לא נמצאה מצלמה במכשיר');
      } else if (error.name === 'NotReadableError') {
        toast.error('המצלמה בשימוש באפליקציה אחרת');
      } else {
        toast.error('לא ניתן לגשת למצלמה: ' + error.message);
      }
    }
  };

  const handleCapture = () => {
    setShowCountdown(true);
  };

  const onCountdownComplete = () => {
    setShowCountdown(false);
    setShowFlash(true);
  };

  const onFlashComplete = () => {
    setShowFlash(false);
    capturePhoto();
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
        const newImages = [...capturedImages, imageData];
        setCapturedImages(newImages);
        setCurrentPhotoIndex(prev => prev + 1);
        
        console.log(`📸 Burst photo ${newImages.length}/${photoCount} captured`);
        
        if (newImages.length >= photoCount) {
          toast.success(`כל התמונות נצלמו! (${photoCount})`);
        } else {
          toast.info(`תמונה ${newImages.length}/${photoCount} - לחץ לצילום הבא`);
          // Make sure video continues playing
          if (videoRef.current && videoRef.current.paused) {
            videoRef.current.play();
          }
        }
      } else {
        // For multiple photos mode (not burst), add to the array instead of replacing
        const newImages = [...capturedImages, imageData];
        setCapturedImages(newImages);
        setCurrentPhotoIndex(prev => prev + 1);
        
        console.log(`📸 Photo ${newImages.length}/${photoCount} captured`);
        
        if (newImages.length >= photoCount) {
          toast.success(`כל התמונות נצלמו! (${photoCount})`);
        } else {
          toast.info(`תמונה ${newImages.length}/${photoCount} - לחץ לצילום הבא`);
        }
      }
    }
  };

  const handleStartRecording = () => {
    setShowCountdown(true);
  };

  const startRecordingAfterCountdown = () => {
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
    setShowFlash(true);

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
    setShowShareDialog(false);
    setShareFileUrl("");
    startCamera(selectedCamera);
  };

  const handleShare = async () => {
    try {
      console.log('🔄 Starting share process...');
      
      // For burst mode, upload all images
      if (mode === 'burst' && capturedImages.length > 1) {
        const uploadPromises = capturedImages.map(async (imageData, index) => {
          const response = await fetch(imageData);
          const blob = await response.blob();
          const fileName = `beer-buddy-burst-${Date.now()}-${index}.jpg`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('shared-media')
            .upload(fileName, blob, {
              contentType: blob.type,
              cacheControl: '604800',
            });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('shared-media')
            .getPublicUrl(fileName);

          await supabase
            .from('shared_media')
            .insert({
              file_path: fileName,
              media_type: 'photo',
            });

          return urlData.publicUrl;
        });

        const urls = await Promise.all(uploadPromises);
        setShareFileUrl(urls.join(','));
        setShowShareDialog(true);
        toast.success(`${capturedImages.length} תמונות הועלו!`);
        return;
      }

      // Single image/video flow
      const fileToShare = editedImage || capturedImages[0];
      if (!fileToShare) {
        toast.error('אין תוכן לשיתוף');
        return;
      }

      const response = await fetch(fileToShare);
      const blob = await response.blob();
      
      const isVideo = mode === 'video' || mode === 'gif';
      const fileExtension = isVideo ? (mode === 'video' ? 'mp4' : 'webm') : 'jpg';
      const mediaType = mode === 'gif' ? 'gif' : isVideo ? 'video' : 'photo';
      const fileName = `beer-buddy-${mediaType}-${Date.now()}.${fileExtension}`;
      
      console.log('📤 Uploading to storage:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('shared-media')
        .upload(fileName, blob, {
          contentType: blob.type,
          cacheControl: '604800',
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('shared-media')
        .getPublicUrl(fileName);

      console.log('✅ File uploaded successfully:', urlData.publicUrl);

      await supabase
        .from('shared_media')
        .insert({
          file_path: fileName,
          media_type: mediaType,
        });

      setShareFileUrl(urlData.publicUrl);
      setShowShareDialog(true);
      
    } catch (error) {
      console.error('❌ Error sharing:', error);
      toast.error('שגיאה בשיתוף. נסה שוב.');
    }
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

  useEffect(() => {
    if (showCountdown === false && showFlash && mode === 'gif') {
      startRecordingAfterCountdown();
    }
  }, [showCountdown, showFlash, mode]);

  return (
    <div className="min-h-screen p-4">
      {showCountdown && <Countdown onComplete={onCountdownComplete} />}
      {showFlash && <CameraFlash show={showFlash} onComplete={onFlashComplete} />}
      
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onBack} size="lg" className="text-lg">
            <ArrowRight className="ml-2" />
            חזור
          </Button>
          <h1 className="text-5xl font-bold text-center text-foreground flex-1">
            {getModeTitle()}
          </h1>
          <div className="w-24" />
        </div>
        <p className="text-center text-muted-foreground mb-8 text-xl">
          {getModeDescription()}
        </p>

        {capturedImages.length === 0 && cameras.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Video className="w-4 h-4" />
                בחר מצלמה
              </label>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={getCameras}
                className="h-8"
              >
                <RefreshCw className="w-4 h-4 ml-1" />
                רענן
              </Button>
            </div>
            <Select 
              value={selectedCamera} 
              onValueChange={(value) => {
                console.log('📹 Camera selected:', value);
                setSelectedCamera(value);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="בחר מצלמה" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50">
                {cameras
                  .filter(camera => camera.deviceId && camera.deviceId.trim() !== '')
                  .map((camera, index) => (
                    <SelectItem key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `מצלמה ${index + 1}`}
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

        {(capturedImages.length === 0 || (capturedImages.length < photoCount && mode !== 'burst')) ? (
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
                onClick={handleStartRecording}
                size="lg"
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-2xl px-12 py-8 h-auto font-bold shadow-glow"
              >
                <Camera className="mr-3 w-8 h-8" />
                התחל הקלטה! 🎬
              </Button>
            )}
            {mode === 'gif' && isRecording && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-destructive text-destructive-foreground px-8 py-4 rounded-2xl text-2xl font-bold animate-pulse shadow-glow">
                מקליט... ⏺️
              </div>
            )}
            {(mode === 'single' || mode === 'burst') && (
              <Button
                onClick={handleCapture}
                size="lg"
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-2xl px-12 py-8 h-auto font-bold shadow-glow animate-pulse"
                disabled={capturedImages.length >= photoCount}
              >
                <Camera className="mr-3 w-8 h-8" />
                {capturedImages.length > 0 
                  ? `צלם ${capturedImages.length + 1}/${photoCount} 📸`
                  : 'צלם עכשיו! 📸'
                }
              </Button>
            )}
            {capturedImages.length > 0 && (
              <div className="absolute top-4 left-4 flex gap-2">
                {capturedImages.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Captured ${idx + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border-2 border-primary shadow-lg"
                  />
                ))}
              </div>
            )}
          </div>
        ) : mode === 'gif' ? (
          <div className="space-y-8">
            <div className="text-center">
              <h3 className="text-3xl font-bold mb-6 text-primary">🎬 הוידאו שלך מוכן! 🎬</h3>
              <video
                src={capturedImages[0]}
                controls
                loop
                autoPlay
                className="w-full rounded-2xl shadow-glow border-2 border-primary/30 max-w-2xl mx-auto"
              />
            </div>
            <div className="flex gap-6 justify-center flex-wrap">
              <Button
                onClick={handleShare}
                size="lg"
                className="text-2xl px-12 py-8 h-auto font-bold bg-primary hover:bg-primary/90 shadow-glow"
              >
                מצוין, נשתף! 🎉
              </Button>
              
              <Button
                onClick={reset}
                variant="secondary"
                size="lg"
                className="text-2xl px-12 py-8 h-auto font-bold"
              >
                ננסה שוב 🔄
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
                  onClick={handleCapture}
                  size="lg"
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-2xl px-12 py-8 h-auto font-bold shadow-glow animate-pulse"
                >
                  <Camera className="mr-3 w-8 h-8" />
                  צלם {capturedImages.length + 1}/{photoCount} 📸
                </Button>
                <div className="absolute top-4 left-4 flex gap-2">
                  {capturedImages.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Captured ${idx + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border-2 border-primary shadow-lg"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-6">
                  {capturedImages.length === 1 ? (
                    <img
                      src={capturedImages[0]}
                      alt="Captured"
                      className="w-full rounded-2xl shadow-glow border-2 border-primary/30 max-w-2xl mx-auto"
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {capturedImages.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Captured ${idx + 1}`}
                          className="w-full rounded-2xl shadow-glow border-2 border-primary/30"
                        />
                      ))}
                    </div>
                  )}
                  
                  {editedImage && (
                    <div className="text-center">
                      <h3 className="text-3xl font-bold mb-4 text-primary">
                        {mode === 'video' ? '✨ הסרטון שלך מוכן! ✨' : '🍺 עם בירה מושלמת! 🍺'}
                      </h3>
                      {mode === 'video' ? (
                        <video
                          src={editedImage}
                          controls
                          loop
                          className="w-full rounded-2xl shadow-glow border-2 border-accent max-w-2xl mx-auto"
                        />
                      ) : (
                        <img
                          src={editedImage}
                          alt="Edited"
                          className="w-full rounded-2xl shadow-glow border-2 border-accent max-w-2xl mx-auto"
                        />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-6 justify-center flex-wrap mt-8">
                  {!editedImage && (
                    <Button
                      onClick={processImages}
                      disabled={isProcessing}
                      size="lg"
                      className="text-2xl px-12 py-8 h-auto font-bold shadow-glow"
                    >
                      {isProcessing ? "מעבד... ⏳" : 
                       mode === 'video' ? "צור סרטון קסם ✨" :
                       "הוסף בירה 🍺"}
                    </Button>
                  )}
                  
                  {editedImage && (
                    <Button
                      onClick={handleShare}
                      size="lg"
                      className="text-2xl px-12 py-8 h-auto font-bold bg-primary hover:bg-primary/90 shadow-glow"
                    >
                      מצוין, נשתף! 🎉
                    </Button>
                  )}
                  
                  <Button
                    onClick={reset}
                    variant="secondary"
                    size="lg"
                    className="text-2xl px-12 py-8 h-auto font-bold"
                  >
                    ננסה שוב 🔄
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        fileUrl={shareFileUrl}
        mediaType={mode === 'gif' ? 'gif' : mode === 'video' ? 'video' : 'photo'}
        onEmailSent={() => {
          toast.success('תודה ששיתפת! 🎉');
        }}
      />
    </div>
  );
};
