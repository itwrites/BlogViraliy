// Referenced from stripe integration blueprint
import Stripe from 'stripe';

let connectionSettings: any;
let stripeAvailable: boolean | null = null;
let credentialsCache: { publishableKey: string; secretKey: string } | null = null;

export function isStripeTestMode(): boolean {
  return process.env.STRIPE_TEST_MODE === 'true';
}

function isTestMode(): boolean {
  return process.env.STRIPE_TEST_MODE === 'true';
}

async function getCredentials(): Promise<{ publishableKey: string; secretKey: string } | null> {
  // Return cached result if available
  if (credentialsCache) return credentialsCache;
  if (stripeAvailable === false) return null;
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken || !hostname) {
    console.warn(`[Stripe] Warning: Stripe connector not available (missing ${!hostname ? 'hostname' : 'token'}). Payment features will be disabled.`);
    stripeAvailable = false;
    return null;
  }

  const connectorName = 'stripe';
  // Use STRIPE_TEST_MODE env var to determine which credentials to use
  // If STRIPE_TEST_MODE=true, use development (test) keys
  // Otherwise, use production (live) keys
  const targetEnvironment = isTestMode() ? 'development' : 'production';

  try {
    const url = new URL(`https://${hostname}/api/v2/connection`);
    url.searchParams.set('include_secrets', 'true');
    url.searchParams.set('connector_names', connectorName);
    url.searchParams.set('environment', targetEnvironment);

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    });

    const data = await response.json();
    
    connectionSettings = data.items?.[0];

    if (!connectionSettings || (!connectionSettings.settings?.publishable || !connectionSettings.settings?.secret)) {
      console.warn(`[Stripe] Warning: Stripe ${targetEnvironment} connection not configured. Payment features will be disabled. Please set up Stripe in the Replit Integrations panel.`);
      stripeAvailable = false;
      return null;
    }

    credentialsCache = {
      publishableKey: connectionSettings.settings.publishable,
      secretKey: connectionSettings.settings.secret,
    };
    stripeAvailable = true;
    const modeLabel = isTestMode() ? 'TEST' : 'LIVE';
    console.log(`[Stripe] Successfully connected to Stripe (${modeLabel} mode, using ${targetEnvironment} credentials)`);
    return credentialsCache;
  } catch (error) {
    console.warn(`[Stripe] Warning: Failed to fetch Stripe credentials: ${error}. Payment features will be disabled.`);
    stripeAvailable = false;
    return null;
  }
}

export async function isStripeConfigured(): Promise<boolean> {
  if (stripeAvailable !== null) return stripeAvailable;
  const creds = await getCredentials();
  return creds !== null;
}

export async function getUncachableStripeClient(): Promise<Stripe | null> {
  const credentials = await getCredentials();
  if (!credentials) return null;

  return new Stripe(credentials.secretKey, {
    apiVersion: '2025-11-17.clover',
  });
}

export async function getStripePublishableKey(): Promise<string | null> {
  const credentials = await getCredentials();
  return credentials?.publishableKey ?? null;
}

export async function getStripeSecretKey(): Promise<string | null> {
  const credentials = await getCredentials();
  return credentials?.secretKey ?? null;
}

let stripeSync: any = null;

export async function getStripeSync(): Promise<any | null> {
  if (!stripeSync) {
    const secretKey = await getStripeSecretKey();
    if (!secretKey) {
      console.warn('[Stripe] Cannot initialize StripeSync - Stripe credentials not available');
      return null;
    }
    
    const { StripeSync } = await import('stripe-replit-sync');

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
