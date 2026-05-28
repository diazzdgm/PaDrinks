const { getStripe, getSupabaseAdmin, getUserFromAuthHeader, siteOrigin } = require('./_lib/clients');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromAuthHeader(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const origin = siteOrigin(req);

    const { data: row } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!row?.stripe_customer_id) {
      return res.status(400).json({ error: 'No subscription found for this user' });
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: row.stripe_customer_id,
      return_url: `${origin}/`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
