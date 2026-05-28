const { getStripe, getSupabaseAdmin, PRICE_BY_PLAN } = require('./_lib/clients');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

  const stripe = getStripe();
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  const supabase = getSupabaseAdmin();

  const PLAN_BY_PRICE = Object.fromEntries(
    Object.entries(PRICE_BY_PLAN).map(([plan, priceId]) => [priceId, plan])
  );

  function periodEndISO(sub) {
    const unix = sub.items?.data?.[0]?.current_period_end ?? sub.current_period_end;
    return unix ? new Date(unix * 1000).toISOString() : null;
  }

  async function upsertSubscription(userId, sub) {
    const priceId = sub.items?.data?.[0]?.price?.id;
    const plan = PLAN_BY_PRICE[priceId] || null;

    const { error } = await supabase.from('subscriptions').upsert({
      user_id: userId,
      stripe_customer_id: sub.customer,
      stripe_subscription_id: sub.id,
      status: sub.status,
      plan,
      current_period_end: periodEndISO(sub),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (error) throw new Error(`subscriptions upsert failed: ${error.message}`);
  }

  async function resolveUserId(sub, fallbackClientRef) {
    if (sub?.metadata?.supabase_user_id) {
      return sub.metadata.supabase_user_id;
    }
    if (fallbackClientRef) {
      return fallbackClientRef;
    }
    const { data } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', sub.customer)
      .maybeSingle();
    return data?.user_id || null;
  }

  try {
    const obj = event.data.object;

    if (event.type === 'checkout.session.completed') {
      const sessionSub = obj.subscription;
      if (!sessionSub) {
        return res.status(200).json({ received: true });
      }
      const sub = await stripe.subscriptions.retrieve(sessionSub);
      const userId = await resolveUserId(sub, obj.client_reference_id);
      if (userId) {
        await upsertSubscription(userId, sub);
      }
    } else if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated'
    ) {
      const sub = obj;
      const userId = await resolveUserId(sub, null);
      if (userId) {
        await upsertSubscription(userId, sub);
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const sub = obj;
      const userId = await resolveUserId(sub, null);
      if (userId) {
        const { error } = await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: sub.customer,
          stripe_subscription_id: sub.id,
          status: 'canceled',
          current_period_end: periodEndISO(sub),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
        if (error) throw new Error(`subscriptions cancel upsert failed: ${error.message}`);
      }
    }
  } catch (err) {
    console.error('stripe-webhook error:', err.message);
    return res.status(500).json({ error: err.message });
  }

  return res.status(200).json({ received: true });
};

module.exports.config = { api: { bodyParser: false } };
