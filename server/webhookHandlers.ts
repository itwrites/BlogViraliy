// Referenced from stripe integration blueprint
import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import Stripe from 'stripe';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
    
    // Parse the event to handle custom logic
    try {
      const stripe = await getUncachableStripeClient();
      const event = JSON.parse(payload.toString()) as Stripe.Event;
      
      await WebhookHandlers.handleCustomLogic(event, stripe);
    } catch (error) {
      console.error('Custom webhook logic error:', error);
    }
  }
  
  static async handleCustomLogic(event: Stripe.Event, stripe: Stripe): Promise<void> {
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
        if (invoice.subscription) {
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
    
    // Find user by Stripe customer ID
    const user = await storage.getUserByStripeCustomerId(customerId);
    if (!user) {
      console.error(`No user found for Stripe customer ${customerId}`);
      return;
    }
    
    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price.id;
    const productId = subscription.items.data[0]?.price.product as string;
    
    // Get product to determine plan
    const product = await stripe.products.retrieve(productId);
    const planId = product.metadata?.plan_id || 'launch';
    
    // Update user with subscription info
    await storage.updateUser(user.id, {
      stripeSubscriptionId: subscriptionId,
      subscriptionPlan: planId,
      subscriptionStatus: subscription.status,
      postsUsedThisMonth: 0,
      postsResetDate: new Date(),
    });
    
    console.log(`User ${user.id} subscribed to ${planId} plan`);
  }
  
  static async handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
    if (!customerId) return;
    
    const user = await storage.getUserByStripeCustomerId(customerId);
    if (!user) return;
    
    // Update subscription status
    await storage.updateUser(user.id, {
      subscriptionStatus: subscription.status === 'canceled' ? 'canceled' : subscription.status,
    });
    
    console.log(`User ${user.id} subscription status: ${subscription.status}`);
  }
  
  static async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;
    
    const user = await storage.getUserByStripeCustomerId(customerId);
    if (!user) return;
    
    // Reset monthly post count on successful payment
    await storage.updateUser(user.id, {
      postsUsedThisMonth: 0,
      postsResetDate: new Date(),
    });
    
    console.log(`User ${user.id} monthly posts reset after invoice payment`);
  }
}
