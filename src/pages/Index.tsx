import { useState } from "react";
import { CameraCapture } from "@/components/CameraCapture";
import { ModeSelector } from "@/components/ModeSelector";
import { PhotoMode } from "@/types/photo-mode";

const Index = () => {
  const [selectedMode, setSelectedMode] = useState<PhotoMode | null>(null);
  const [photoCount, setPhotoCount] = useState(3);

  const handleSelectMode = (mode: PhotoMode, count?: number) => {
    setSelectedMode(mode);
    if (count) setPhotoCount(count);
  };

  const handleBack = () => {
    setSelectedMode(null);
  };

  if (!selectedMode) {
    return <ModeSelector onSelectMode={handleSelectMode} />;
  }

  return (
    <CameraCapture 
      mode={selectedMode} 
      photoCount={photoCount}
      onBack={handleBack}
    />
  );
};

export default Index;
