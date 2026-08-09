import {
  Chart02Icon,
  CheckmarkCircle02Icon,
  Home01Icon,
  Settings02Icon,
  Store01Icon,
  UserGroupIcon,
  ViewIcon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons';
import type { IconType } from '@/components/shared/icon';

export type NavItem = {
  href: string;
  label: string;
  glyph: IconType;
};

export const primaryNav: NavItem[] = [
  { href: '/merchant', label: "Vue d'ensemble", glyph: Home01Icon },
  { href: '/merchant/products', label: 'Catalogue', glyph: Store01Icon },
  { href: '/merchant/campaigns', label: 'Campagnes', glyph: Chart02Icon },
  { href: '/merchant/sellers', label: 'Vendeurs', glyph: UserGroupIcon },
  { href: '/merchant/orders', label: 'Commandes', glyph: CheckmarkCircle02Icon },
  { href: '/merchant/analytics', label: 'Analytique', glyph: Chart02Icon },
  { href: '/merchant/payments', label: 'Paiements', glyph: Wallet01Icon },
];

export const secondaryNav: NavItem[] = [
  { href: '/merchant/subscription', label: 'Abonnement & Quotas', glyph: Wallet01Icon },
  { href: '/merchant/delivery-zones', label: 'Zones de livraison', glyph: Store01Icon },
  { href: '/merchant/settings', label: 'Réglages', glyph: Settings02Icon },
];

export const allNav: NavItem[] = [...primaryNav, ...secondaryNav];
