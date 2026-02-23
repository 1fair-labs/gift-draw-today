/**
 * Phantom mobile deep link: build connect URL for Telegram WebView.
 * Opens Phantom app with "Connect to this app?" dialog instead of opening the site.
 * @see https://docs.phantom.app/phantom-deeplinks/provider-methods/connect
 */
import nacl from 'tweetnacl';
import bs58 from 'bs58';

const PHANTOM_CONNECT_BASE = 'https://phantom.app/ul/v1/connect';
const STORAGE_KEY_KEYPAIR = 'phantom_deeplink_keypair';
const STORAGE_KEY_PUBLIC_KEY = 'phantom_deeplink_public_key';
const STORAGE_KEY_SESSION = 'phantom_deeplink_session';

export function getStoredPhantomPublicKey(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY_PUBLIC_KEY);
  } catch {
    return null;
  }
}

export function getStoredPhantomSession(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY_SESSION);
  } catch {
    return null;
  }
}

export function clearPhantomDeeplinkStorage(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY_KEYPAIR);
    sessionStorage.removeItem(STORAGE_KEY_PUBLIC_KEY);
    sessionStorage.removeItem(STORAGE_KEY_SESSION);
  } catch {
    // ignore
  }
}

/**
 * Build Phantom connect deep link URL. Generates a new x25519 keypair per call
 * and stores it in sessionStorage for decryption on return (optional).
 * Returns URL to open in external browser/Phantom app.
 */
export function buildPhantomConnectUrl(options: {
  redirectLink: string;
  appUrl?: string;
  cluster?: 'mainnet-beta' | 'testnet' | 'devnet';
}): string {
  const { redirectLink, appUrl = redirectLink, cluster = 'mainnet-beta' } = options;
  const keypair = nacl.box.keyPair();
  const dappEncryptionPublicKey = bs58.encode(keypair.publicKey);
  try {
    sessionStorage.setItem(
      STORAGE_KEY_KEYPAIR,
      JSON.stringify({
        publicKey: Array.from(keypair.publicKey),
        secretKey: Array.from(keypair.secretKey),
      })
    );
  } catch {
    // ignore
  }
  const params = new URLSearchParams({
    redirect_link: redirectLink,
    app_url: appUrl,
    dapp_encryption_public_key: dappEncryptionPublicKey,
    cluster,
  });
  return `${PHANTOM_CONNECT_BASE}?${params.toString()}`;
}

/**
 * Parse Phantom connect redirect: extract public_key and session from URL.
 * Call on app load when returning from Phantom. Returns data and clears params from URL.
 */
export function parsePhantomRedirectParams(): { publicKey: string; session: string } | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const publicKey = params.get('public_key');
  const session = params.get('session');
  const errorCode = params.get('errorCode');
  if (errorCode) {
    console.warn('Phantom connect rejected:', params.get('errorMessage') || errorCode);
    clearParamsFromUrl();
    return null;
  }
  if (!publicKey || !session) return null;
  try {
    sessionStorage.setItem(STORAGE_KEY_PUBLIC_KEY, publicKey);
    sessionStorage.setItem(STORAGE_KEY_SESSION, session);
  } catch {
    return null;
  }
  clearParamsFromUrl();
  return { publicKey, session };
}

function clearParamsFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('public_key');
    url.searchParams.delete('session');
    url.searchParams.delete('data');
    url.searchParams.delete('nonce');
    url.searchParams.delete('phantom_encryption_public_key');
    url.searchParams.delete('errorCode');
    url.searchParams.delete('errorMessage');
    window.history.replaceState({}, '', url.pathname + (url.search || '') + (url.hash || ''));
  } catch {
    // ignore
  }
}
