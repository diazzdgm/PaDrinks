import { Platform } from 'react-native';
import { getSupabase } from '../lib/supabase';
import AuthService from './AuthService';

const ACTIVE_STATUSES = ['active', 'trialing', 'past_due'];

const SubscriptionService = {
  async getEntitlement() {
    const sb = getSupabase();
    if (!sb) return null;
    const user = await AuthService.getUser();
    if (!user) return null;
    const { data } = await sb
      .from('subscriptions')
      .select('status, plan, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();
    return data || null;
  },

  async hasActiveSubscription() {
    const entitlement = await this.getEntitlement();
    if (!entitlement) return false;
    if (!ACTIVE_STATUSES.includes(entitlement.status)) return false;
    if (!entitlement.current_period_end) return entitlement.status === 'active' || entitlement.status === 'trialing';
    return new Date(entitlement.current_period_end).getTime() > Date.now();
  },

  async startCheckout(plan, { onBeforeRedirect } = {}) {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
    const token = await AuthService.getAccessToken();
    if (!token) return false;

    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) return false;
    const { url } = await res.json();
    if (!url) return false;

    if (typeof onBeforeRedirect === 'function') onBeforeRedirect();
    window.location.href = url;
    return true;
  },

  async openPortal() {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
    const token = await AuthService.getAccessToken();
    if (!token) return false;

    const res = await fetch('/api/create-portal-session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const { url } = await res.json();
    if (!url) return false;
    window.location.href = url;
    return true;
  },
};

export default SubscriptionService;
