import { PhotoMode, PHOTO_MODES } from "@/types/photo-mode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface ModeSelectorProps {
  onSelectMode: (mode: PhotoMode, count?: number) => void;
}

export const ModeSelector = ({ onSelectMode }: ModeSelectorProps) => {
  const [burstCount, setBurstCount] = useState<number>(2);
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold text-center mb-4 text-foreground">
          בחר את סוג הצילום
        </h1>
        <p className="text-center text-muted-foreground mb-12 text-xl">
          מה אתם רוצים ליצור?
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PHOTO_MODES.map((config) => (
            <Card 
              key={config.mode}
              className="hover:scale-105 transition-all duration-300 hover:shadow-glow border-2 border-border bg-card cursor-pointer group"
              onClick={() => {
                if (config.mode === 'burst') {
                  onSelectMode(config.mode, burstCount);
                } else {
                  onSelectMode(config.mode);
                }
              }}
            >
              <CardContent className="p-10 text-center space-y-6">
                <div className="text-9xl group-hover:scale-110 transition-transform">{config.icon}</div>
                <h3 className="text-3xl font-bold text-foreground">{config.label}</h3>
                <p className="text-lg text-muted-foreground min-h-[3rem]">{config.description}</p>
                
                {config.mode === 'burst' && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <label className="text-base font-medium mb-3 block text-foreground">כמה תמונות?</label>
                    <Select 
                      value={burstCount.toString()} 
                      onValueChange={(value) => setBurstCount(parseInt(value))}
                    >
                      <SelectTrigger className="w-full text-lg h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 תמונות</SelectItem>
                        <SelectItem value="3">3 תמונות</SelectItem>
                        <SelectItem value="4">4 תמונות</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <Button 
                  size="lg"
                  className="w-full text-xl py-6 font-bold"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (config.mode === 'burst') {
                      onSelectMode(config.mode, burstCount);
                    } else {
                      onSelectMode(config.mode);
                    }
                  }}
                >
                  בחר ✨
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
