import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * Scrolls the window to the top whenever the route changes.
 *
 * Place this hook once, high in the tree (e.g. inside the top-level Router).
 * It listens to location changes from wouter and resets scroll position
 * so users always see the beginning of a new page instead of inheriting
 * the scroll offset from the previous one.
 *
 * Anchor links (e.g. `#features`) are respected: if the hash is non-empty
 * we let the browser handle the native scroll-to-anchor behaviour.
 */
export function useScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    // If there's a hash, let the browser scroll to the anchor naturally.
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [location]);
}
