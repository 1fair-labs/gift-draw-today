// src/pages/Landing.tsx
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function Landing() {
  const handleConnect = () => {
    window.location.href = "https://t.me/giftdrawtoday_bot?startapp";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">GiftDraw.today</h1>
          <p className="text-muted-foreground">
            Fair, transparent lottery on Telegram. No setup. Just play.
          </p>
        </div>
        <Button
          onClick={handleConnect}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold"
        >
          Play in Telegram
        </Button>
        <p className="text-xs text-muted-foreground">
          Works only inside Telegram app
        </p>
      </Card>
    </div>
  );
}