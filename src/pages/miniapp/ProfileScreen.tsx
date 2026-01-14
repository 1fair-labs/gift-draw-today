// src/pages/miniapp/ProfileScreen.tsx
import { useState, useEffect } from 'react';
import { Copy, Eye, EyeOff, Wallet, Gift, ExternalLink, Loader2, Send } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/supabase';

interface ProfileScreenProps {
  telegramUser: any;
  user: User | null;
  walletAddress: string | null;
  giftBalance: number;
  usdtBalance: number;
  tonBalance: number;
  isBalanceVisible: boolean;
  onToggleBalanceVisibility: () => void;
  onConnectWallet: () => void;
  onBuyTicket: () => void;
  loading?: boolean;
}

export default function ProfileScreen({
  telegramUser,
  user,
  walletAddress,
  giftBalance,
  usdtBalance,
  tonBalance,
  isBalanceVisible,
  onToggleBalanceVisibility,
  onConnectWallet,
  onBuyTicket,
  loading,
}: ProfileScreenProps) {
  const { toast } = useToast();
  const [hasRefTicket, setHasRefTicket] = useState(false);

  // Check if user has ref ticket (this would need to be fetched from Supabase)
  useEffect(() => {
    // TODO: Fetch ref tickets from Supabase
    // For now, we'll check if user has any tickets with special status
    setHasRefTicket(false);
  }, []);

  const giftPrice = 0.0002; // GIFT/USDT
  const usdBalance = (giftBalance * giftPrice).toFixed(2);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  const shareViaTelegram = () => {
    if (!refLink) return;
    
    const message = "Here's a free GIFT ticket - join the draw with me!";
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(message)}`;
    
    const WebApp = (window as any).Telegram?.WebApp;
    if (WebApp && WebApp.openTelegramLink) {
      WebApp.openTelegramLink(shareUrl);
    } else if (WebApp && WebApp.openLink) {
      WebApp.openLink(shareUrl);
    } else {
      // Fallback для браузера
      window.open(shareUrl, '_blank');
    }
  };

  const refLink = user?.anon_id 
    ? `https://t.me/giftdrawtoday_bot?start=ref_${user.anon_id}`
    : '';

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="p-4 pt-2 pb-10 md:pb-6 space-y-6">
        {/* Profile Header */}
        <Card className="glass-card p-6">
          {/* Wallet Connection */}
          {!walletAddress ? (
            <Button
              onClick={onConnectWallet}
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-display font-bold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </>
              )}
            </Button>
          ) : (
            <>
              {/* Balances */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-neon-gold" />
                    <h3 className="text-lg font-display font-bold">Balances</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onToggleBalanceVisibility}
                      className="h-8 w-8 p-0 hover:bg-transparent hover:text-inherit active:bg-transparent"
                    >
                      {isBalanceVisible ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  {/* GIFT Balance */}
                  <div>
                    <div className="text-xl font-display font-bold text-neon-gold min-h-[2.5rem] flex items-center">
                      {isBalanceVisible 
                        ? `${giftBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GIFT`
                        : '•••••• GIFT'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 min-h-[1rem]">
                      {isBalanceVisible ? `≈ ${usdBalance} USDT` : '≈ •••••• USDT'}
                    </div>
                  </div>

                  {/* USDT Balance */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">USDT (Jetton)</span>
                    </div>
                    <div className="text-lg font-display font-bold min-h-[1.75rem] flex items-center">
                      {isBalanceVisible 
                        ? (usdtBalance > 0 
                            ? `${usdtBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDT`
                            : `0.00 USDT`)
                        : '•••••• USDT'}
                    </div>
                  </div>

                  {/* TON Balance */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">TON (gas)</span>
                    </div>
                    <div className="text-lg font-display font-bold min-h-[1.75rem] flex items-center">
                      {isBalanceVisible 
                        ? (tonBalance > 0 
                            ? `${tonBalance.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} TON`
                            : `0.0000 TON`)
                        : '•••••• TON'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Wallet</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(walletAddress, 'Wallet address')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs font-mono break-all text-muted-foreground">{walletAddress}</p>
              </div>
            </>
          )}
        </Card>

        {/* Referral Program */}
        <Card className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-5 h-5 text-neon-gold" />
            <h3 className="text-lg font-display font-bold">
              AirDrop <span className="text-sm text-muted-foreground font-normal">CryptoDrawToken</span>
            </h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                To participate in the airdrop, send a GIFT ticket to your friend and after its activation, you will automatically become an airdrop participant. The more friends you invite, the more tokens you will receive!
              </p>
            </div>

            {refLink && (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Your referral link:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={refLink}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-muted border border-border rounded-md"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={shareViaTelegram}
                    className="hover:bg-transparent hover:text-inherit active:bg-transparent"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <div>
              <Badge 
                variant={hasRefTicket ? "default" : "outline"}
                className={hasRefTicket ? "bg-neon-green/20 text-neon-green border-neon-green/30" : ""}
              >
                {hasRefTicket ? 'You are participating in Airdrop' : 'You are not participating in Airdrop'}
              </Badge>
            </div>

          </div>
        </Card>
      </div>
    </div>
  );
}

