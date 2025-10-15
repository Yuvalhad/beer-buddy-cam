import { Button } from "@/components/ui/button";

interface WelcomeScreenProps {
  onStart: () => void;
}

export const WelcomeScreen = ({ onStart }: WelcomeScreenProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background gradient - now using body gradient */}
      
      {/* Content */}
      <div className="relative z-10 text-center space-y-8 max-w-2xl">
        <div className="space-y-4">
          <h1 className="text-7xl font-bold animate-fade-in">
            🍺
          </h1>
          <h2 className="text-5xl font-bold text-foreground animate-fade-in">
            Beer Buddy Cam
          </h2>
          <p className="text-xl text-muted-foreground animate-fade-in">
            תפוס את הרגעים הכי שווים של האירוע!
          </p>
        </div>

        <Button
          onClick={onStart}
          size="lg"
          className="text-2xl px-16 py-12 h-auto rounded-2xl font-bold shadow-glow animate-pulse hover:scale-105 transition-transform"
        >
          גע בי כדי להתחיל! 🎉
        </Button>

        <div className="text-sm text-muted-foreground mt-8 animate-fade-in">
          מהיר • כיף • פשוט
        </div>
      </div>
    </div>
  );
};
