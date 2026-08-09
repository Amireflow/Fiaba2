import {
  Chart02Icon,
  Home01Icon,
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

export const sellerPrimaryNav: NavItem[] = [
  { href: '/seller', label: 'Découvrir', glyph: Home01Icon },
  { href: '/seller/campaigns', label: 'Mes campagnes', glyph: Chart02Icon },
  { href: '/seller/sales', label: 'Mes ventes', glyph: Store01Icon },
  { href: '/seller/earnings', label: 'Revenus', glyph: Wallet01Icon },
];

export const sellerSecondaryNav: NavItem[] = [
  { href: '/seller/profile', label: 'Mon profil', glyph: ViewIcon },
];

export const sellerAllNav: NavItem[] = [...sellerPrimaryNav, ...sellerSecondaryNav];
