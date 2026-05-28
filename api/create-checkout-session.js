const { getStripe, getSupabaseAdmin, getUserFromAuthHeader, PRICE_BY_PLAN, siteOrigin } = require('./_lib/clients');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromAuthHeader(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { plan } = req.body || {};
  if (!plan || !PRICE_BY_PLAN[plan]) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  try {
    const stripe = getStripe();
    const supabase = getSupabaseAdmin();
    const origin = siteOrigin(req);

    const { data: existingRow } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    let customerId = existingRow?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      await supabase.from('subscriptions').upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        status: 'incomplete',
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: PRICE_BY_PLAN[plan], quantity: 1 }],
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
      allow_promotion_codes: true,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
