export type ProductStatus = 'Actif' | 'Brouillon' | 'Épuisé';
export type CampaignStatus = 'Active' | 'En pause' | 'Terminée';
export type OrderStatus = 'À préparer' | 'En livraison' | 'Livrée' | 'Annulée';
export type CommissionType = 'percentage' | 'fixed';
export type CommissionModel = 'Commission' | 'Marge';

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: ProductStatus;
  description?: string;
  image?: string;
  weight?: number; // en grammes
  lowStockThreshold?: number;
};

export type Campaign = {
  id: string;
  name: string;
  description?: string;
  product?: string;
  commission: number;
  commissionType: CommissionType;
  model: CommissionModel;
  goal?: number;
  sellers: number;
  sales: number;
  status: CampaignStatus;
  startDate?: string;
  endDate?: string;
};

export type Order = {
  id: string;
  customer: string;
  amount: number;
  date: string;
  status: OrderStatus;
  sellerId?: string;
  sellerCode?: string;
  sellerName?: string;
  productName?: string;
  quantity?: number;
  zone?: string;
  deliveryFee?: number;
  paymentMethod?: string;
  phone?: string;
  address?: string;
  commissionAmount?: number;
};

export type DeliveryZone = [name: string, active: boolean, fee: number];

export type MerchantProfile = {
  name: string;
  phone: string;
  email: string;
};

/* ── Seller types ── */

export type SellerNiche = 'Beauté' | 'Mode' | 'Maison' | 'Épicerie' | 'Tech' | 'Sport';

export type SellerProfile = {
  name: string;
  phone: string;
  city: string;
  niches: SellerNiche[];
  bio: string;
  socialLinks: { whatsapp?: string; instagram?: string; tiktok?: string; facebook?: string };
  reputation: number; // 0-100
  followers: string;
};

export type Opportunity = {
  id: string;
  productName: string;
  merchantName: string;
  category: string;
  price: number;
  commission: number; // percentage
  model: 'Commission' | 'Marge';
  potential: 'Fort' | 'Bon' | 'Moyen';
  zones: string[];
  campaignId: string;
  image?: string;
};

export type SellerCampaign = {
  id: string;
  campaignId: string;
  campaignName: string;
  productName: string;
  merchantName: string;
  commission: number;
  model: 'Commission' | 'Marge';
  status: 'Rejointe' | 'Active' | 'Terminée';
  link: string;
  code: string;
  clicks: number;
  sales: number;
  earnings: number;
  joinedDate: string;
};

export type SellerOrderStatus = 'En cours' | 'Livré' | 'Payé' | 'Annulé';

export type SellerOrder = {
  id: string;
  customer: string;
  product: string;
  amount: number;
  commission: number;
  date: string;
  status: SellerOrderStatus;
};

export type SellerEarning = {
  available: number;
  pending: number;
  cancelled: number;
  total: number;
};

export type SellerPayout = {
  id: string;
  date: string;
  amount: number;
  account: string;
  status: 'Versé' | 'En attente';
};

/* ── Admin types ── */

export type UserRole = 'marchand' | 'vendeur' | 'administrateur';
export type VerificationStatus = 'Vérifié' | 'En attente' | 'Refusé' | 'Suspendu';

export type AdminUser = {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  city: string;
  status: VerificationStatus;
  joinedDate: string;
  trustScore: number; // 0-100
  sales: number;
  disputes: number;
};

export type AdminProduct = {
  id: string;
  name: string;
  merchant: string;
  category: string;
  price: number;
  status: 'Actif' | 'Brouillon' | 'Suspendu' | 'Retiré';
  reported: boolean;
  createdAt: string;
};

export type AdminCampaign = {
  id: string;
  name: string;
  merchant: string;
  model: 'Commission' | 'Marge';
  commission: number;
  sellers: number;
  sales: number;
  status: 'Active' | 'En pause' | 'Suspendue' | 'Terminée';
  createdAt: string;
};

export type AdminOrderStatus =
  | 'Créée'
  | 'Confirmée'
  | 'En livraison'
  | 'Livrée'
  | 'Payée'
  | 'Annulée'
  | 'Refusée'
  | 'Litige';

export type AdminOrder = {
  id: string;
  customer: string;
  seller: string;
  merchant: string;
  amount: number;
  zone: string;
  date: string;
  status: AdminOrderStatus;
  paymentMethod: 'COD' | 'Wave' | 'Orange Money';
};

export type AdminCommission = {
  id: string;
  orderId: string;
  seller: string;
  merchant: string;
  model: 'Commission' | 'Marge';
  amount: number;
  status: 'En attente' | 'Disponible' | 'Versée' | 'Reprise';
  date: string;
};

export type AdminPayout = {
  id: string;
  seller: string;
  amount: number;
  account: string;
  status: 'Demandée' | 'En traitement' | 'Versée' | 'Refusée';
  date: string;
};

export type AdminDispute = {
  id: string;
  orderId: string;
  party: string;
  reason: string;
  openedDate: string;
  status: 'Ouvert' | 'En revue' | 'Résolu' | 'Fermé';
  amount: number;
};

export type AdminFraudAlert = {
  id: string;
  type: 'Auto-commande' | 'Multi-comptes' | 'Tracking suspect' | 'Refus anormal' | 'Retrait suspect' | 'Volume anormal';
  target: string;
  detail: string;
  severity: 'Critique' | 'Élevé' | 'Moyen';
  status: 'Nouveau' | 'En revue' | 'Bloqué' | 'Ignoré';
  date: string;
};

export type ZoneLevel = 'Région' | 'Département' | 'Commune';

export type AdminZone = {
  id: string;
  name: string;
  level: ZoneLevel;
  parent: string; // parent region/department or '—' for regions
  active: boolean;
  communes: number;
};

export type AdminNiche = {
  id: string;
  name: string;
  type: 'Catégorie' | 'Sous-niche';
  parent: string; // parent category or '—'
  tags: string[];
  sellers: number;
  products: number;
  active: boolean;
};

export type AdminCountrySetting = {
  key: string;
  label: string;
  value: string;
  category: 'Pays' | 'Frais' | 'Intégration';
  status: 'Actif' | 'Inactif' | 'À configurer';
};
