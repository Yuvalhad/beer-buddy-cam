import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string;
  mediaType: 'photo' | 'gif' | 'video';
  onEmailSent?: () => void;
}

export const ShareDialog = ({ 
  open, 
  onOpenChange, 
  fileUrl, 
  mediaType,
  onEmailSent 
}: ShareDialogProps) => {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSendEmail = async () => {
    if (!email.trim()) {
      toast.error("אנא הזן כתובת אימייל");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("אנא הזן כתובת אימייל תקינה");
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const { data, error } = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-media-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            email,
            fileUrl,
            mediaType,
            fileData: base64
          })
        }
      ).then(res => res.json());

      if (error) throw error;

      toast.success("המייל נשלח בהצלחה! 📧");
      setEmail("");
      onEmailSent?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error("שגיאה בשליחת המייל. נסה שוב.");
    } finally {
      setIsSending(false);
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = `beer-buddy-${mediaType}-${Date.now()}.${mediaType === 'video' ? 'mp4' : mediaType === 'gif' ? 'webm' : 'jpg'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("הורדה החלה! 📥");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">שתף את היצירה שלך! 🎉</DialogTitle>
          <DialogDescription className="text-center">
            שלח במייל או סרוק את הברקוד להורדה
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Email Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2">
              <Mail className="w-4 h-4" />
              שלח לאימייל
            </label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendEmail()}
                className="flex-1"
                dir="ltr"
              />
              <Button 
                onClick={handleSendEmail} 
                disabled={isSending}
                className="font-bold"
              >
                {isSending ? "שולח..." : "שלח"}
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">או</span>
            </div>
          </div>

          {/* QR Code */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-center">סרוק להורדה</p>
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <QRCodeSVG 
                value={fileUrl} 
                size={200}
                level="H"
                includeMargin
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              סרוק עם המצלמה של הטלפון להורדה ישירה
            </p>
          </div>

          {/* Download Button */}
          <Button 
            onClick={handleDownload}
            variant="outline"
            className="w-full font-bold"
          >
            <Download className="ml-2 w-4 h-4" />
            הורד ישירות
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
