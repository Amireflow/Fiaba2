import type { Opportunity, SellerCampaign, SellerOrder, SellerPayout, SellerProfile, SellerEarning } from '@/types/entities';

export const seedSellerProfile: SellerProfile = {
  name: 'Marième Fall',
  phone: '+221 77 482 19 06',
  city: 'Dakar',
  niches: ['Beauté', 'Mode'],
  bio: "Passionnée de beauté naturelle et de mode sénégalaise. Je partage ce que j'aime, je vends ce en quoi je crois.",
  socialLinks: {
    whatsapp: '+221774821906',
    instagram: '@marieme.fall',
    tiktok: '@marieme.beauty',
  },
  reputation: 82,
  followers: '12,4k abonnés',
};

export const seedOpportunities: Opportunity[] = [
  { id: 'op-1', productName: 'Coffret Soin Karité', merchantName: 'Maison Ndar', category: 'Beauté', price: 12500, commission: 12, model: 'Commission', potential: 'Fort', zones: ['Dakar', 'Thiès'], campaignId: 'c-1' },
  { id: 'op-2', productName: 'Boubou Ndar — Indigo', merchantName: 'Maison Ndar', category: 'Mode', price: 28500, commission: 15, model: 'Marge', potential: 'Fort', zones: ['Dakar'], campaignId: 'c-2' },
  { id: 'op-3', productName: 'Huile de Baobab 100ml', merchantName: 'Maison Ndar', category: 'Beauté', price: 7200, commission: 10, model: 'Commission', potential: 'Bon', zones: ['Dakar', 'Thiès', 'Saint-Louis'], campaignId: 'c-1' },
  { id: 'op-4', productName: 'Panier petit-déjeuner', merchantName: 'Maison Ndar', category: 'Maison', price: 9500, commission: 8, model: 'Commission', potential: 'Moyen', zones: ['Dakar'], campaignId: 'c-3' },
  { id: 'op-5', productName: 'Tisane Bissap Premium', merchantName: 'Saveurs du Sénégal', category: 'Épicerie', price: 5500, commission: 14, model: 'Commission', potential: 'Bon', zones: ['Dakar', 'Thiès'], campaignId: 'c-4' },
  { id: 'op-6', productName: 'Sac en cuir artisanal', merchantName: 'Atelier Dakar', category: 'Mode', price: 18500, commission: 18, model: 'Marge', potential: 'Fort', zones: ['Dakar'], campaignId: 'c-5' },
];

export const seedSellerCampaigns: SellerCampaign[] = [
  { id: 'sc-1', campaignId: 'c-1', campaignName: 'Rentrée douce — septembre', productName: 'Coffret Soin Karité', merchantName: 'Maison Ndar', commission: 12, model: 'Commission', status: 'Active', link: 'fiaba.sn/p/coffret-karite?ref=marieme', code: 'MARIFALL', clicks: 142, sales: 8, earnings: 12000, joinedDate: '15 mars 2024' },
  { id: 'sc-2', campaignId: 'c-2', campaignName: 'Le goût de chez nous', productName: 'Boubou Ndar — Indigo', merchantName: 'Maison Ndar', commission: 15, model: 'Marge', status: 'Active', link: 'fiaba.sn/p/boubou-indigo?ref=marieme', code: 'MARIFALL', clicks: 87, sales: 3, earnings: 8500, joinedDate: '22 mars 2024' },
];

export const seedSellerOrders: SellerOrder[] = [
  { id: 'CMD-240618', customer: 'Fatou Sarr', product: 'Coffret Soin Karité', amount: 12500, commission: 1500, date: '18 juin, 10:42', status: 'En cours' },
  { id: 'CMD-240617', customer: 'Moussa Diop', product: 'Boubou Ndar — Indigo', amount: 28500, commission: 4275, date: '17 juin, 16:08', status: 'Livré' },
  { id: 'CMD-240616', customer: 'Awa Ndiaye', product: 'Coffret Soin Karité', amount: 12500, commission: 1500, date: '16 juin, 09:24', status: 'Payé' },
  { id: 'CMD-240615', customer: 'Khadija Ba', product: 'Coffret Soin Karité', amount: 12500, commission: 1500, date: '15 juin, 18:12', status: 'Payé' },
  { id: 'CMD-240614', customer: 'Ibrahima Sow', product: 'Boubou Ndar — Indigo', amount: 28500, commission: 4275, date: '14 juin, 14:30', status: 'Annulé' },
];

export const seedSellerEarning: SellerEarning = {
  available: 20500,
  pending: 5775,
  cancelled: 4275,
  total: 30550,
};

export const seedSellerPayouts: SellerPayout[] = [
  { id: 'sp-1', date: '14 juin 2024', amount: 15000, account: 'Wave · · · 38 42', status: 'Versé' },
  { id: 'sp-2', date: '31 mai 2024', amount: 12000, account: 'Wave · · · 38 42', status: 'Versé' },
  { id: 'sp-3', date: '15 mai 2024', amount: 8500, account: 'Orange Money · · · 11 07', status: 'Versé' },
];
