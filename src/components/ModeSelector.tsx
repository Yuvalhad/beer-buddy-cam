import { PhotoMode, PHOTO_MODES } from "@/types/photo-mode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface ModeSelectorProps {
  onSelectMode: (mode: PhotoMode, count?: number) => void;
}

export const ModeSelector = ({ onSelectMode }: ModeSelectorProps) => {
  const [burstCount, setBurstCount] = useState<number>(3);
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
              className="hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-6 text-center">
                <div className="text-6xl mb-4">{config.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{config.label}</h3>
                <p className="text-sm text-muted-foreground mb-4">{config.description}</p>
                
                {config.mode === 'burst' && (
                  <div className="mb-4">
                    <label className="text-sm font-medium mb-2 block">כמה תמונות?</label>
                    <Select 
                      value={burstCount.toString()} 
                      onValueChange={(value) => setBurstCount(parseInt(value))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">תמונה 1</SelectItem>
                        <SelectItem value="2">2 תמונות</SelectItem>
                        <SelectItem value="3">3 תמונות</SelectItem>
                        <SelectItem value="4">4 תמונות</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <Button 
                  className="w-full"
                  onClick={() => {
                    if (config.mode === 'burst') {
                      onSelectMode(config.mode, burstCount);
                    } else {
                      onSelectMode(config.mode);
                    }
                  }}
                >
                  בחר
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
