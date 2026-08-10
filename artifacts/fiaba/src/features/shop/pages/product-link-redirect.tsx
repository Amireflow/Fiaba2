import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';

/**
 * Redirect component for short product links.
 *
 * Links shared by sellers use the format:
 *   fiaba.sn/p/{trackingToken}
 *
 * This component looks up the tracking link by token, retrieves the
 * campaign_id, and redirects to:
 *   /checkout/{campaignId}?t={token}
 */
export function ProductLinkRedirect() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [error, setError] = useState(false);

  useEffect(() => {
    async function resolveAndRedirect() {
      if (!id) {
        setError(true);
        return;
      }

      // Try to look up as a tracking token
      const { data: link } = await supabase
        .from('tracking_links')
        .select('campaign_id, is_active, expires_at')
        .eq('token', id)
        .single();

      const tl = link as { campaign_id: string; is_active: boolean; expires_at: string | null } | null;

      if (tl && tl.is_active) {
        // Check expiry
        if (tl.expires_at && new Date(tl.expires_at) < new Date()) {
          setError(true);
          return;
        }
        // Redirect to product page with campaign_id + token
        navigate(`/product/${tl.campaign_id}?t=${id}`, { replace: true });
        return;
      }

      // Fallback: if not a tracking token, treat as campaign_id directly
      // (preserves backward compat for direct campaign links)
      const query = window.location.search;
      navigate(`/product/${id}${query}`, { replace: true });
    }

    resolveAndRedirect().catch(() => setError(true));
  }, [id, navigate]);

  if (error) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#f8f8fc] px-5">
        <div className="text-center">
          <p className="font-[Space_Grotesk] text-xl font-bold text-[#292541]">Lien invalide</p>
          <p className="mt-2 text-sm text-[#77738a]">Ce lien n'existe pas ou a expiré.</p>
          <a href="/" className="mt-4 inline-block rounded-xl bg-[#5b49e8] px-5 py-2.5 text-sm font-bold text-white">Retour à l'accueil</a>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-[#f8f8fc]">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#e4e1ff] border-t-[#5b49e8]" />
        <p className="mt-4 text-sm font-bold text-[#77738a]">Redirection…</p>
      </div>
    </div>
  );
}
