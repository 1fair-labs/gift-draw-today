// src/pages/miniapp/ProfileScreen.tsx
import { useState, useEffect } from 'react';
import { Copy, Eye, EyeOff, Wallet, Gift, ExternalLink } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/supabase';

interface ProfileScreenProps {
  telegramUser: any;
  user: User | null;
  walletAddress: string | null;
  cltBalance: number;
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
  cltBalance,
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

  const cltPrice = 0.041; // CLT/USDT
  const usdBalance = (cltBalance * cltPrice).toFixed(2);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  const refLink = user?.anon_id 
    ? `https://t.me/cryptolotterytoday_bot?startapp=ref_${user.anon_id}`
    : '';

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="p-4 pt-2 space-y-6">
        {/* Profile Header */}
        <Card className="glass-card p-6">
          <div className="flex items-center gap-4 mb-6">
            {telegramUser?.photo_url && (
              <Avatar className="h-16 w-16">
                <AvatarImage src={telegramUser.photo_url} alt={telegramUser.first_name || 'User'} />
                <AvatarFallback className="text-xl">
                  {telegramUser.first_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-display font-bold truncate">
                {telegramUser?.first_name} {telegramUser?.last_name || ''}
              </h2>
              {telegramUser?.username && (
                <p className="text-sm text-muted-foreground">@{telegramUser.username}</p>
              )}
              {user?.anon_id && (
                <p className="text-xs text-muted-foreground mt-1 font-mono">ID: {user.anon_id}</p>
              )}
            </div>
          </div>

          {/* Wallet Connection */}
          {!walletAddress ? (
            <Button
              onClick={onConnectWallet}
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-display font-bold"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet
            </Button>
          ) : (
            <div className="space-y-2">
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
          )}
        </Card>

        {/* Balances */}
        {walletAddress && (
          <Card className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-bold">Balances</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleBalanceVisibility}
                className="h-8 w-8 p-0"
              >
                {isBalanceVisible ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="space-y-4">
              {/* CLT Balance */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">CLT</span>
                </div>
                <div className="text-2xl font-display font-bold text-neon-gold">
                  {isBalanceVisible 
                    ? `${cltBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CLT`
                    : '•••••• CLT'}
                </div>
                {isBalanceVisible && (
                  <div className="text-xs text-muted-foreground mt-1">
                    ≈ ${usdBalance} USDT
                  </div>
                )}
              </div>

              {/* USDT Balance */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">USDT (Jetton)</span>
                </div>
                <div className="text-xl font-display font-bold">
                  {isBalanceVisible 
                    ? `${usdtBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
                    : '•••••• USDT'}
                </div>
              </div>

              {/* TON Balance */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">TON</span>
                </div>
                <div className="text-xl font-display font-bold">
                  {isBalanceVisible 
                    ? `${tonBalance.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} TON`
                    : '•••••• TON'}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Referral Program */}
        <Card className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-5 h-5 text-neon-gold" />
            <h3 className="text-lg font-display font-bold">Referral Program</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Participate in the airdrop! Send a Gift ticket to a friend and get a ref ticket. It will automatically include you in the airdrop participant list.
              </p>
              
              <Badge 
                variant={hasRefTicket ? "default" : "outline"}
                className={hasRefTicket ? "bg-neon-green/20 text-neon-green border-neon-green/30" : ""}
              >
                {hasRefTicket ? 'You are participating in Airdrop' : 'You are not participating in Airdrop'}
              </Badge>
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
                    onClick={() => copyToClipboard(refLink, 'Referral link')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

          </div>
        </Card>
      </div>
    </div>
  );
}

