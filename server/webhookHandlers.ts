import { getUncachableStripeClient, getWebhookSecret, validateProjectMetadata, getProjectId } from './stripeClient';
import { storage } from './storage';
import Stripe from 'stripe';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<{ success: boolean; message: string }> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const stripe = await getUncachableStripeClient();
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const webhookSecret = getWebhookSecret();
    
    if (!webhookSecret) {
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction) {
        console.error('[Stripe Webhook] SECURITY ERROR: No webhook secret configured in production. Rejecting request.');
        throw new Error('Webhook secret not configured');
      }
      console.warn('[Stripe Webhook] WARNING: No webhook secret configured. Skipping signature verification (DEVELOPMENT ONLY).');
    }

    let event: Stripe.Event;
    
    try {
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      } else {
        event = JSON.parse(payload.toString()) as Stripe.Event;
      }
    } catch (err: any) {
      console.error('[Stripe Webhook] Signature verification failed:', err.message);
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    const isValidProject = await WebhookHandlers.validateEventProject(event, stripe);
    
    if (!isValidProject) {
      console.log(`[Stripe Webhook] Ignoring event ${event.type} - project_id mismatch (expected: ${getProjectId()})`);
      return { success: true, message: 'Event ignored - different project' };
    }

    console.log(`[Stripe Webhook] Processing ${event.type} for project ${getProjectId()}`);
    
    await WebhookHandlers.handleCustomLogic(event, stripe);
    
    return { success: true, message: `Processed ${event.type}` };
  }
  
  static async validateEventProject(event: Stripe.Event, stripe: Stripe): Promise<boolean> {
    const eventObject = event.data.object as any;
    
    if (eventObject.metadata && validateProjectMetadata(eventObject.metadata)) {
      return true;
    }
    
    if (eventObject.subscription_details?.metadata && validateProjectMetadata(eventObject.subscription_details.metadata)) {
      return true;
    }
    
    let subscriptionId: string | null = null;
    
    if (event.type.startsWith('customer.subscription')) {
      subscriptionId = eventObject.id;
    } else if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
      subscriptionId = typeof eventObject.subscription === 'string' 
        ? eventObject.subscription 
        : eventObject.subscription?.id;
    } else if (event.type === 'checkout.session.completed') {
      subscriptionId = typeof eventObject.subscription === 'string'
        ? eventObject.subscription
        : eventObject.subscription?.id;
    }
    
    if (subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (validateProjectMetadata(subscription.metadata)) {
          return true;
        }
      } catch (error) {
        console.warn(`[Stripe Webhook] Could not retrieve subscription ${subscriptionId} for project validation`);
      }
    }
    
    const customerId = typeof eventObject.customer === 'string' 
      ? eventObject.customer 
      : eventObject.customer?.id;
    
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted && validateProjectMetadata((customer as Stripe.Customer).metadata)) {
          return true;
        }
      } catch (error) {
        console.warn(`[Stripe Webhook] Could not retrieve customer ${customerId} for project validation`);
      }
    }
    
    return false;
  }
  
  static async handleCustomLogic(event: Stripe.Event, stripe: Stripe | null): Promise<void> {
    if (!stripe) return;
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.customer && session.subscription) {
          await WebhookHandlers.handleCheckoutComplete(session, stripe);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await WebhookHandlers.handleSubscriptionChange(subscription);
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionRef = (invoice as any).subscription;
        if (subscriptionRef) {
          await WebhookHandlers.handleInvoicePaid(invoice);
        }
        break;
      }
    }
  }
  
  static async handleCheckoutComplete(session: Stripe.Checkout.Session, stripe: Stripe): Promise<void> {
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    
    if (!customerId || !subscriptionId) return;
    
    const user = await storage.getUserByStripeCustomerId(customerId);
    if (!user) {
      console.error(`[Stripe Webhook] No user found for Stripe customer ${customerId}`);
      return;
    }
    
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price.id;
    const productId = subscription.items.data[0]?.price.product as string;
    
    const product = await stripe.products.retrieve(productId);
    const planId = product.metadata?.plan_id || 'launch';
    
    await storage.updateUser(user.id, {
      stripeSubscriptionId: subscriptionId,
      subscriptionPlan: planId,
      subscriptionStatus: subscription.status,
      postsUsedThisMonth: 0,
      postsResetDate: new Date(),
    });
    
    console.log(`[Stripe Webhook] User ${user.id} subscribed to ${planId} plan`);
  }
  
  static async handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
    if (!customerId) return;
    
    const user = await storage.getUserByStripeCustomerId(customerId);
    if (!user) return;
    
    await storage.updateUser(user.id, {
      subscriptionStatus: subscription.status === 'canceled' ? 'canceled' : subscription.status,
    });
    
    console.log(`[Stripe Webhook] User ${user.id} subscription status: ${subscription.status}`);
  }
  
  static async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;
    
    const user = await storage.getUserByStripeCustomerId(customerId);
    if (!user) return;
    
    await storage.updateUser(user.id, {
      postsUsedThisMonth: 0,
      postsResetDate: new Date(),
    });
    
    console.log(`[Stripe Webhook] User ${user.id} monthly posts reset after invoice payment`);
  }
}
