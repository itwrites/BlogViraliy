import { getUncachableStripeClient, isStripeConfigured, addProjectMetadata } from './stripeClient';

export class StripeService {
  async isAvailable(): Promise<boolean> {
    return await isStripeConfigured();
  }
  
  async getStripeClient() {
    return await getUncachableStripeClient();
  }

  async createCustomer(email: string, userId: string) {
    const stripe = await getUncachableStripeClient();
    if (!stripe) {
      throw new Error('Stripe is not configured. Please add STRIPE_SECRET_KEY environment variable.');
    }
    return await stripe.customers.create({
      email,
      metadata: addProjectMetadata({ userId }),
    });
  }

  async createCheckoutSession(
    customerId: string, 
    priceId: string, 
    successUrl: string, 
    cancelUrl: string,
    additionalMetadata: Record<string, string> = {}
  ) {
    const stripe = await getUncachableStripeClient();
    if (!stripe) {
      throw new Error('Stripe is not configured. Please add STRIPE_SECRET_KEY environment variable.');
    }
    return await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: addProjectMetadata(additionalMetadata),
      },
    });
  }

  async createCustomerPortalSession(customerId: string, returnUrl: string) {
    const stripe = await getUncachableStripeClient();
    if (!stripe) {
      throw new Error('Stripe is not configured. Please add STRIPE_SECRET_KEY environment variable.');
    }
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async getProduct(productId: string) {
    const stripe = await getUncachableStripeClient();
    if (!stripe) return null;
    
    try {
      return await stripe.products.retrieve(productId);
    } catch (error) {
      console.error('[Stripe] Error fetching product:', error);
      return null;
    }
  }

  async listProducts(active = true, limit = 20) {
    const stripe = await getUncachableStripeClient();
    if (!stripe) return [];
    
    try {
      const products = await stripe.products.list({ active, limit });
      return products.data;
    } catch (error) {
      console.error('[Stripe] Error listing products:', error);
      return [];
    }
  }

  async getPrice(priceId: string) {
    const stripe = await getUncachableStripeClient();
    if (!stripe) return null;
    
    try {
      return await stripe.prices.retrieve(priceId);
    } catch (error) {
      console.error('[Stripe] Error fetching price:', error);
      return null;
    }
  }

  async listPrices(active = true, limit = 20) {
    const stripe = await getUncachableStripeClient();
    if (!stripe) return [];
    
    try {
      const prices = await stripe.prices.list({ active, limit });
      return prices.data;
    } catch (error) {
      console.error('[Stripe] Error listing prices:', error);
      return [];
    }
  }

  async getSubscription(subscriptionId: string) {
    const stripe = await getUncachableStripeClient();
    if (!stripe) return null;
    
    try {
      return await stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      console.error('[Stripe] Error fetching subscription:', error);
      return null;
    }
  }

  async cancelSubscription(subscriptionId: string, atPeriodEnd = true) {
    const stripe = await getUncachableStripeClient();
    if (!stripe) {
      throw new Error('Stripe is not configured.');
    }
    
    if (atPeriodEnd) {
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      return await stripe.subscriptions.cancel(subscriptionId);
    }
  }

  async listProductsWithPrices(active = true, limit = 20) {
    const stripe = await getUncachableStripeClient();
    if (!stripe) return [];
    
    try {
      const products = await stripe.products.list({ active, limit });
      const prices = await stripe.prices.list({ active, limit: 100 });
      
      const results: any[] = [];
      
      for (const product of products.data) {
        const productPrices = prices.data.filter(
          price => typeof price.product === 'string' 
            ? price.product === product.id 
            : price.product?.id === product.id
        );
        
        if (productPrices.length === 0) {
          results.push({
            product_id: product.id,
            product_name: product.name,
            product_description: product.description,
            product_active: product.active,
            product_metadata: product.metadata,
            price_id: null,
            unit_amount: null,
            currency: null,
            recurring: null,
            price_active: null,
            price_metadata: null,
          });
        } else {
          for (const price of productPrices) {
            results.push({
              product_id: product.id,
              product_name: product.name,
              product_description: product.description,
              product_active: product.active,
              product_metadata: product.metadata,
              price_id: price.id,
              unit_amount: price.unit_amount,
              currency: price.currency,
              recurring: price.recurring,
              price_active: price.active,
              price_metadata: price.metadata,
            });
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error('[Stripe] Error listing products with prices:', error);
      return [];
    }
  }
}

export const stripeService = new StripeService();
