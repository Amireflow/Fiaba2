import { useEffect } from 'react';
import { useParams, useLocation } from 'wouter';

/**
 * Redirect component for short product links.
 *
 * Links shared by sellers use the format:
 *   fiaba.sn/p/{productId}?t={token}
 *
 * This component redirects them to the checkout page:
 *   /checkout/{productId}?t={token}
 *
 * The token (containing the signed seller attribution payload)
 * is preserved in the query string.
 */
export function ProductLinkRedirect() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  useEffect(() => {
    // Preserve query string (the ?t=token part)
    const query = window.location.search;
    navigate(`/checkout/${id}${query}`, { replace: true });
  }, [id, navigate]);

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-[#f8f8fc]">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#e4e1ff] border-t-[#5b49e8]" />
        <p className="mt-4 text-sm font-bold text-[#77738a]">Redirection…</p>
      </div>
    </div>
  );
}
