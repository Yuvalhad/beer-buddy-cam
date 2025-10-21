import { useState } from "react";
import { CameraCapture } from "@/components/CameraCapture";
import { ModeSelector } from "@/components/ModeSelector";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { PhotoMode } from "@/types/photo-mode";

const Index = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [selectedMode, setSelectedMode] = useState<PhotoMode | null>(null);
  const [photoCount, setPhotoCount] = useState(1);

  const handleStart = () => {
    setShowWelcome(false);
  };

  const handleSelectMode = (mode: PhotoMode, count?: number) => {
    console.log('🎯 Mode selected:', mode, 'Count:', count);
    setSelectedMode(mode);
    if (count) {
      console.log('✅ Setting photo count to:', count);
      setPhotoCount(count);
    } else {
      console.log('⚠️ No count provided, keeping default:', photoCount);
    }
  };

  const handleBack = () => {
    setSelectedMode(null);
  };

  const handleReset = () => {
    setSelectedMode(null);
    setShowWelcome(true);
  };

  if (showWelcome) {
    return <WelcomeScreen onStart={handleStart} />;
  }

  if (!selectedMode) {
    return <ModeSelector onSelectMode={handleSelectMode} />;
  }

  return (
    <CameraCapture 
      mode={selectedMode} 
      photoCount={photoCount}
      onBack={handleBack}
      onReset={handleReset}
    />
  );
};

export default Index;
