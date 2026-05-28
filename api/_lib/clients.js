const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const PRICES_TEST = {
  monthly: 'price_1TbAjOJe8NaSnHv6OqVpS0T5',
  annual: 'price_1TbAjSJe8NaSnHv6zTZaCb2k',
};

const PRICES_LIVE = {
  monthly: 'price_1TbrFwJOr3M3dXYuzc4MeAzi',
  annual: 'price_1TbrFuJOr3M3dXYuEj2jDhXf',
};

const PRICE_BY_PLAN = (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_live')
  ? PRICES_LIVE
  : PRICES_TEST;

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL || 'https://moyvfmaftjyapbnozemp.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

async function getUserFromAuthHeader(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const supabase = getSupabaseAdmin();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

function siteOrigin(req) {
  return req.headers['origin'] || 'https://www.padrinks.com';
}

module.exports = { getStripe, getSupabaseAdmin, getUserFromAuthHeader, PRICE_BY_PLAN, siteOrigin };
