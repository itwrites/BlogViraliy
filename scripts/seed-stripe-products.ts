import Stripe from 'stripe';

async function getStripeClient() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', 'stripe');
  url.searchParams.set('environment', 'development');

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X_REPLIT_TOKEN': xReplitToken
    }
  });

  const data = await response.json();
  const connectionSettings = data.items?.[0];

  if (!connectionSettings?.settings?.secret) {
    throw new Error('Stripe connection not found');
  }

  return new Stripe(connectionSettings.settings.secret, {
    apiVersion: '2025-08-27.basil',
  });
}

async function seedProducts() {
  console.log('Seeding Stripe products...');
  const stripe = await getStripeClient();

  const existingProducts = await stripe.products.search({ query: "active:'true'" });
  const existingNames = existingProducts.data.map(p => p.name);

  const plans = [
    {
      name: 'Launch',
      description: 'Perfect for founders and serious bloggers who want their site to stay active without manual work.',
      price: 7900,
      metadata: {
        plan_id: 'launch',
        posts_per_month: '30',
        max_sites: '1',
        max_team_members: '1'
      }
    },
    {
      name: 'Growth',
      description: 'Best for growth teams and SEO operators who want to scale content consistently.',
      price: 17900,
      metadata: {
        plan_id: 'growth',
        posts_per_month: '120',
        max_sites: '3',
        max_team_members: '3',
        popular: 'true'
      }
    },
    {
      name: 'Scale',
      description: 'Built for agencies and publishers running multiple sites or client projects.',
      price: 34900,
      metadata: {
        plan_id: 'scale',
        posts_per_month: '400',
        max_sites: '-1',
        max_team_members: '-1'
      }
    }
  ];

  for (const plan of plans) {
    if (existingNames.includes(plan.name)) {
      console.log(`Product "${plan.name}" already exists, skipping...`);
      continue;
    }

    console.log(`Creating product: ${plan.name}`);
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: plan.metadata,
    });

    console.log(`Creating price for ${plan.name}: $${plan.price / 100}/month`);
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.price,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { plan_id: plan.metadata.plan_id },
    });

    console.log(`Created ${plan.name}: product=${product.id}, price=${price.id}`);
  }

  console.log('Done seeding Stripe products!');
}

seedProducts().catch(console.error);
