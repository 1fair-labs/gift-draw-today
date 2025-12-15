import { useState } from 'react';
import { Wallet, LogOut, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WalletButtonProps {
  isConnected: boolean;
  address?: string;
  balance?: number; // CLT balance
  cltPrice?: number; // CLT price in USDT
  onConnect: () => void;
  onDisconnect: () => void;
}

export const WalletButton = ({
  isConnected,
  address,
  balance = 0,
  cltPrice = 0.87,
  onConnect,
  onDisconnect,
}: WalletButtonProps) => {
  const [copied, setCopied] = useState(false);
  
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };
  
  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const usdtValue = (balance * cltPrice).toFixed(2);
  
  if (!isConnected) {
    return (
      <Button
        onClick={onConnect}
        className="bg-gradient-to-r from-neon-purple to-neon-cyan hover:opacity-90 transition-opacity font-semibold"
      >
        <Wallet className="w-4 h-4 mr-2" />
        Connect Wallet
      </Button>
    );
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="border-neon-purple/50 bg-card/50 hover:bg-card/80 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end text-xs">
              <span className="text-neon-gold font-bold">{balance.toFixed(2)} CLT</span>
              <span className="text-muted-foreground">≈ ${usdtValue}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              <span className="font-mono text-sm">{formatAddress(address!)}</span>
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64 bg-card border-border">
        <div className="p-3">
          <div className="text-sm text-muted-foreground mb-1">Balance</div>
          <div className="text-xl font-bold text-neon-gold">{balance.toFixed(4)} CLT</div>
          <div className="text-sm text-muted-foreground">≈ ${usdtValue} USDT</div>
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleCopy} className="cursor-pointer">
          {copied ? (
            <Check className="w-4 h-4 mr-2 text-neon-green" />
          ) : (
            <Copy className="w-4 h-4 mr-2" />
          )}
          {copied ? 'Copied!' : 'Copy Address'}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={onDisconnect}
          className="cursor-pointer text-red-400 focus:text-red-400"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
