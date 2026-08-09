import {
  Alert01Icon,
  CheckmarkCircle02Icon,
  DashboardSquare01Icon,
  MapPinIcon,
  Settings02Icon,
  Shield01Icon,
  Store01Icon,
  Tag01Icon,
  UserGroupIcon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons';
import type { IconType } from '@/components/shared/icon';

export type NavItem = {
  href: string;
  label: string;
  glyph: IconType;
};

export const adminPrimaryNav: NavItem[] = [
  { href: '/admin', label: "Vue d'ensemble", glyph: DashboardSquare01Icon },
  { href: '/admin/users', label: 'Utilisateurs', glyph: UserGroupIcon },
  { href: '/admin/products', label: 'Produits & campagnes', glyph: Store01Icon },
  { href: '/admin/orders', label: 'Commandes', glyph: CheckmarkCircle02Icon },
  { href: '/admin/commissions', label: 'Commissions', glyph: Wallet01Icon },
  { href: '/admin/payouts', label: 'Retraits', glyph: Wallet01Icon },
];

export const adminSecondaryNav: NavItem[] = [
  { href: '/admin/disputes', label: 'Litiges', glyph: Alert01Icon },
  { href: '/admin/fraud', label: 'Fraude & risque', glyph: Shield01Icon },
  { href: '/admin/zones', label: 'Référentiel zones', glyph: MapPinIcon },
  { href: '/admin/niches', label: 'Niches & catégories', glyph: Tag01Icon },
  { href: '/admin/settings', label: 'Paramètres', glyph: Settings02Icon },
];

export const adminAllNav: NavItem[] = [...adminPrimaryNav, ...adminSecondaryNav];
