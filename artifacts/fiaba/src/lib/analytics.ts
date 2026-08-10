import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';

/**
 * Analytics tracking utility (CDC §25)
 * Tracks the 22 product events defined in the cahier des charges.
 */

type AnalyticsEventType =
  | 'signup_started'
  | 'signup_completed'
  | 'niche_selected'
  | 'product_viewed'
  | 'campaign_viewed'
  | 'campaign_joined'
  | 'share_clicked'
  | 'tracking_link_clicked'
  | 'zone_coverage_checked'
  | 'checkout_started'
  | 'order_created'
  | 'order_confirmed'
  | 'order_shipped'
  | 'order_delivered'
  | 'payment_confirmed'
  | 'sale_validated'
  | 'commission_created'
  | 'margin_created'
  | 'payout_requested'
  | 'payout_completed'
  | 'order_refused'
  | 'order_returned';

/**
 * Track an analytics event. Non-blocking — fires and forgets.
 * User ID is resolved from the current auth session.
 */
export function trackEvent(
  eventType: AnalyticsEventType,
  options?: {
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }
) {
  // Fire and forget — don't block UI
  (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await (supabase.from('analytics_events') as any).insert({
        event_type: eventType,
        user_id: user?.id ?? null,
        entity_type: options?.entityType ?? null,
        entity_id: options?.entityId ?? null,
        metadata: options?.metadata ?? null,
      });
    } catch {
      // Silently fail — analytics should never break the app
    }
  })();
}

/**
 * Hook version that automatically resolves the current user.
 */
export function useAnalytics() {
  const { profile } = useAuth();

  return {
    track: (
      eventType: AnalyticsEventType,
      options?: {
        entityType?: string;
        entityId?: string;
        metadata?: Record<string, unknown>;
      }
    ) => {
      // Fire and forget
      (async () => {
        try {
          await (supabase.from('analytics_events') as any).insert({
            event_type: eventType,
            user_id: profile?.id ?? null,
            entity_type: options?.entityType ?? null,
            entity_id: options?.entityId ?? null,
            metadata: options?.metadata ?? null,
          });
        } catch {
          // Silently fail
        }
      })();
    },
  };
}
