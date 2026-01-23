// src/components/SolanaWalletModal.tsx
import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Wallet, ExternalLink, CheckCircle2 } from 'lucide-react';

// Helper to detect if we're in Telegram WebView
const isInTelegramWebView = () => {
  return !!(window as any).Telegram?.WebApp;
};

interface SolanaWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SolanaWalletModal({ open, onOpenChange }: SolanaWalletModalProps) {
  const { wallets, select, connect, connecting, publicKey, connected, wallet } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);

  // Filter to only show Phantom
  const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');

  const handleSelectWallet = async (walletName: string) => {
    try {
      setIsConnecting(true);
      
      console.log('🔗 Connecting to wallet:', walletName);
      console.log('📱 Current URL:', window.location.href);
      console.log('📱 User Agent:', navigator.userAgent);
      console.log('📱 Wallet readyState:', phantomWallet?.readyState);
      
      // If wallet is already selected, just connect
      if (wallet && wallet.adapter.name === walletName && connected) {
        // Already connected, just close modal
        console.log('✅ Wallet already connected');
        setIsConnecting(false);
        onOpenChange(false);
        return;
      }
      
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isInTelegram = !!(window as any).Telegram?.WebApp;
      
      // On mobile in Telegram, we need to handle connection differently
      // Phantom will open in external app, so we need to ensure proper callback
      if (isMobile && isInTelegram) {
        console.log('📱 Mobile Telegram detected - using special handling');
        
        // Store current origin for callback
        const currentOrigin = window.location.origin;
        sessionStorage.setItem('phantom_callback_origin', currentOrigin);
        
        // Select the wallet first
        console.log('1️⃣ Selecting wallet:', walletName);
        await select(walletName as any);
        
        // Small delay to ensure wallet adapter is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Connect - this will open Phantom app
        console.log('2️⃣ Connecting to wallet (will open Phantom app)...');
        await connect();
        console.log('3️⃣ Connect call completed - user should be in Phantom app now');
        
        // Close modal immediately as user is redirected to Phantom
        setTimeout(() => {
          setIsConnecting(false);
          onOpenChange(false);
        }, 500);
      } else {
        // Desktop or non-Telegram mobile - standard flow
        console.log('🖥️ Desktop or non-Telegram detected - using standard flow');
        
        // Select the wallet first
        console.log('1️⃣ Selecting wallet:', walletName);
        await select(walletName as any);
        
        // Small delay to ensure wallet adapter is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Then connect to it (this will trigger the wallet popup or deep link)
        console.log('2️⃣ Connecting to wallet...');
        await connect();
        console.log('3️⃣ Connect call completed');
        
        // Modal will close automatically when connected becomes true
      }
    } catch (error) {
      console.error('❌ Error selecting/connecting wallet:', error);
      setIsConnecting(false);
      // Don't close modal on error, let user try again
    }
  };

  // Close modal when wallet is successfully connected
  useEffect(() => {
    if (connected && publicKey && open && !connecting) {
      setIsConnecting(false);
      // Small delay to ensure state is updated
      setTimeout(() => {
        onOpenChange(false);
      }, 300);
    }
  }, [connected, publicKey, open, connecting, onOpenChange]);

  // Check wallet installation status
  // readyState can be: 'Installed', 'Loadable', 'NotDetected', or undefined
  const isInstalled = phantomWallet?.readyState === 'Installed' || phantomWallet?.readyState === 'Loadable';
  const isNotDetected = phantomWallet?.readyState === 'NotDetected';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Log wallet state for debugging
  useEffect(() => {
    if (open && phantomWallet) {
      console.log('🔍 Phantom wallet state:', {
        name: phantomWallet.adapter.name,
        readyState: phantomWallet.readyState,
        isInstalled,
        isNotDetected,
        isMobile,
        connected,
        hasPublicKey: !!publicKey
      });
    }
  }, [open, phantomWallet, isInstalled, isNotDetected, isMobile, connected, publicKey]);
  
  // Get installation URL based on platform
  const getInstallUrl = () => {
    if (isMobile) {
      // Mobile - direct to app store
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        return 'https://apps.apple.com/app/phantom-solana-wallet/1598432977';
      } else {
        return 'https://play.google.com/store/apps/details?id=app.phantom';
      }
    } else {
      // Desktop - Chrome extension
      return 'https://phantom.app/download';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Phantom Wallet</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-2">
            Phantom is a secure, user-friendly Solana wallet trusted by millions. 
            Connect your wallet to buy tickets and participate in draws.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!phantomWallet ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-sm text-muted-foreground">
                Phantom wallet adapter not found. Please refresh the page.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Wallet Card */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {phantomWallet.adapter.icon && (
                    <img
                      src={phantomWallet.adapter.icon}
                      alt="Phantom"
                      className="w-10 h-10 rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">Phantom</h3>
                      {isInstalled && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isInstalled 
                        ? 'Ready to connect' 
                        : isNotDetected 
                        ? 'Not installed' 
                        : 'Checking...'}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="pt-2 border-t space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Why Phantom?</strong>
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Most popular Solana wallet with millions of users</li>
                    <li>Secure and easy to use</li>
                    <li>Works on mobile and desktop</li>
                    <li>Free to download and use</li>
                  </ul>
                </div>

                {/* Action Button */}
                {isInstalled ? (
                  <Button
                    onClick={() => handleSelectWallet('Phantom')}
                    disabled={connecting || isConnecting}
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-display font-bold"
                  >
                    {connecting || isConnecting ? (
                      <>
                        <Wallet className="w-4 h-4 mr-2 animate-pulse" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Wallet className="w-4 h-4 mr-2" />
                        Connect Phantom Wallet
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground text-center">
                      Phantom wallet is not installed. Install it to continue.
                    </p>
                    <Button
                      onClick={() => window.open(getInstallUrl(), '_blank')}
                      className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-display font-bold"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Install Phantom Wallet
                    </Button>
                  </div>
                )}
              </div>

              {/* Help Text */}
              <div className="text-xs text-muted-foreground text-center space-y-1 pt-2 border-t">
                <p>
                  <strong>First time using a crypto wallet?</strong>
                </p>
                <p>
                  A wallet is like a digital bank account for cryptocurrencies. 
                  Phantom makes it easy and secure to manage your Solana assets.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
