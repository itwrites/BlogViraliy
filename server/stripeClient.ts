import Stripe from 'stripe';

const PROJECT_ID = 'blog-autopilot';

let stripeClient: Stripe | null = null;

export function isStripeTestMode(): boolean {
  return process.env.STRIPE_TEST_MODE === 'true';
}

function getStripeSecretKeyFromEnv(): string | null {
  if (isStripeTestMode()) {
    return process.env.STRIPE_SECRET_KEY_TEST || null;
  }
  return process.env.STRIPE_SECRET_KEY || null;
}

function getStripePublishableKeyFromEnv(): string | null {
  if (isStripeTestMode()) {
    return process.env.STRIPE_PUBLISHABLE_KEY_TEST || null;
  }
  return process.env.STRIPE_PUBLISHABLE_KEY || null;
}

export function getWebhookSecret(): string | null {
  if (isStripeTestMode()) {
    return process.env.STRIPE_WEBHOOK_SECRET_TEST || null;
  }
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}

export function getProjectId(): string {
  return PROJECT_ID;
}

export async function isStripeConfigured(): Promise<boolean> {
  const secretKey = getStripeSecretKeyFromEnv();
  const publishableKey = getStripePublishableKeyFromEnv();
  return !!(secretKey && publishableKey);
}

export async function getUncachableStripeClient(): Promise<Stripe | null> {
  const secretKey = getStripeSecretKeyFromEnv();
  if (!secretKey) {
    console.warn('[Stripe] No secret key configured. Payment features disabled.');
    return null;
  }

  return new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
  });
}

export async function getStripeClient(): Promise<Stripe | null> {
  if (stripeClient) return stripeClient;
  
  const secretKey = getStripeSecretKeyFromEnv();
  if (!secretKey) {
    console.warn('[Stripe] No secret key configured. Payment features disabled.');
    return null;
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
  });
  
  const modeLabel = isStripeTestMode() ? 'TEST' : 'LIVE';
  console.log(`[Stripe] Client initialized in ${modeLabel} mode`);
  
  return stripeClient;
}

export async function getStripePublishableKey(): Promise<string | null> {
  return getStripePublishableKeyFromEnv();
}

export async function getStripeSecretKey(): Promise<string | null> {
  return getStripeSecretKeyFromEnv();
}

export function validateProjectMetadata(metadata: Stripe.Metadata | null | undefined): boolean {
  if (!metadata) return false;
  return metadata.project_id === PROJECT_ID;
}

export function addProjectMetadata(metadata: Record<string, string> = {}): Record<string, string> {
  return {
    ...metadata,
    project_id: PROJECT_ID,
  };
}
