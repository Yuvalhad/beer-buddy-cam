import { useState } from "react";
import { CameraCapture } from "@/components/CameraCapture";
import { ModeSelector } from "@/components/ModeSelector";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { PhotoMode } from "@/types/photo-mode";

const Index = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [selectedMode, setSelectedMode] = useState<PhotoMode | null>(null);
  const [photoCount, setPhotoCount] = useState(3);

  const handleStart = () => {
    setShowWelcome(false);
  };

  const handleSelectMode = (mode: PhotoMode, count?: number) => {
    setSelectedMode(mode);
    if (count) setPhotoCount(count);
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
