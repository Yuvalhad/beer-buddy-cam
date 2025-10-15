import { useEffect } from "react";

interface CameraFlashProps {
  show: boolean;
  onComplete: () => void;
}

export const CameraFlash = ({ show, onComplete }: CameraFlashProps) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, 200);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white animate-fade-out" />
  );
};
