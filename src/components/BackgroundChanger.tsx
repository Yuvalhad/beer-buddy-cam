import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Palette, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BackgroundChangerProps {
  imageUrl: string;
  onBackgroundChanged: (newImageUrl: string) => void;
}

const PRESET_BACKGROUNDS = [
  { id: 'beach', label: 'חוף ים', emoji: '🏖️' },
  { id: 'mountain', label: 'הרים', emoji: '🏔️' },
  { id: 'city', label: 'עיר', emoji: '🌆' },
  { id: 'nature', label: 'טבע', emoji: '🌲' },
  { id: 'party', label: 'מסיבה', emoji: '🎉' },
  { id: 'office', label: 'משרד', emoji: '💼' },
  { id: 'cafe', label: 'בית קפה', emoji: '☕' },
  { id: 'studio', label: 'אולפן', emoji: '📸' },
];

const SOLID_COLORS = [
  { color: '#ffffff', label: 'לבן' },
  { color: '#000000', label: 'שחור' },
  { color: '#3b82f6', label: 'כחול' },
  { color: '#22c55e', label: 'ירוק' },
  { color: '#ef4444', label: 'אדום' },
  { color: '#f59e0b', label: 'כתום' },
  { color: '#a855f7', label: 'סגול' },
  { color: '#ec4899', label: 'ורוד' },
];

export const BackgroundChanger = ({ imageUrl, onBackgroundChanged }: BackgroundChangerProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [customBackground, setCustomBackground] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCustomBackground(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const processBackground = async (backgroundData: string, backgroundType: string) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('change-background', {
        body: {
          imageData: imageUrl,
          backgroundData,
          backgroundType
        }
      });

      if (error) throw error;

      if (data.editedImageUrl) {
        onBackgroundChanged(data.editedImageUrl);
        toast.success('הרקע הוחלף בהצלחה! ✨');
      }
    } catch (error: any) {
      console.error('Error changing background:', error);
      if (error.message?.includes('Rate limit')) {
        toast.error('יותר מדי בקשות. אנא נסה שוב בעוד רגע.');
      } else if (error.message?.includes('Payment required')) {
        toast.error('נדרשת הוספת קרדיט. אנא צור קשר עם התמיכה.');
      } else {
        toast.error('שגיאה בהחלפת הרקע. נסה שוב.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePresetClick = (presetId: string) => {
    setSelectedPreset(presetId);
    processBackground(presetId, 'preset');
  };

  const handleColorClick = (color: string) => {
    setSelectedColor(color);
    processBackground(color, 'solid');
  };

  const handleCustomBackgroundApply = () => {
    if (!customBackground) {
      toast.error('אנא בחר תמונת רקע');
      return;
    }
    processBackground(customBackground, 'image');
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ImageIcon className="w-5 h-5" />
        <h3 className="text-xl font-bold">החלף רקע</h3>
      </div>

      <Tabs defaultValue="presets" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="presets">רקעים</TabsTrigger>
          <TabsTrigger value="colors">צבעים</TabsTrigger>
          <TabsTrigger value="custom">העלה תמונה</TabsTrigger>
        </TabsList>

        <TabsContent value="presets" className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {PRESET_BACKGROUNDS.map((preset) => (
              <Button
                key={preset.id}
                onClick={() => handlePresetClick(preset.id)}
                variant={selectedPreset === preset.id ? "default" : "outline"}
                disabled={isProcessing}
                className="h-auto py-4 flex flex-col gap-2"
              >
                <span className="text-3xl">{preset.emoji}</span>
                <span className="text-sm">{preset.label}</span>
              </Button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="colors" className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {SOLID_COLORS.map((colorOption) => (
              <Button
                key={colorOption.color}
                onClick={() => handleColorClick(colorOption.color)}
                variant={selectedColor === colorOption.color ? "default" : "outline"}
                disabled={isProcessing}
                className="h-20 flex flex-col gap-2"
                style={{
                  backgroundColor: selectedColor === colorOption.color ? undefined : colorOption.color,
                  border: `2px solid ${colorOption.color}`
                }}
              >
                <Palette className="w-4 h-4" />
                <span className="text-xs">{colorOption.label}</span>
              </Button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <div className="space-y-3">
            <Label htmlFor="background-upload" className="text-base">
              העלה תמונת רקע
            </Label>
            <Input
              id="background-upload"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isProcessing}
            />
            {customBackground && (
              <div className="space-y-3">
                <img
                  src={customBackground}
                  alt="רקע נבחר"
                  className="w-full rounded-lg border-2 border-primary/30"
                />
                <Button
                  onClick={handleCustomBackgroundApply}
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      מעבד...
                    </>
                  ) : (
                    <>
                      <Upload className="ml-2 h-4 w-4" />
                      החלף רקע
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {isProcessing && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>מחליף רקע...</span>
        </div>
      )}
    </Card>
  );
};
