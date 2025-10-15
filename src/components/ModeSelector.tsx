import { PhotoMode, PHOTO_MODES } from "@/types/photo-mode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ModeSelectorProps {
  onSelectMode: (mode: PhotoMode, count?: number) => void;
}

export const ModeSelector = ({ onSelectMode }: ModeSelectorProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-primary">
          🍺 Beer Buddy Cam
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          בחר את מצב הצילום שלך
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PHOTO_MODES.map((config) => (
            <Card 
              key={config.mode}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => {
                if (config.mode === 'burst') {
                  // For burst mode, we'll show a count selector
                  onSelectMode(config.mode, 3);
                } else {
                  onSelectMode(config.mode);
                }
              }}
            >
              <CardContent className="p-6 text-center">
                <div className="text-6xl mb-4">{config.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{config.label}</h3>
                <p className="text-sm text-muted-foreground">{config.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
