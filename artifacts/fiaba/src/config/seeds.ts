import type { Product, Campaign, Order, DeliveryZone } from '@/types/entities';

export const seedProducts: Product[] = [
  { id: 'p-1', name: 'Coffret Soin Karité', category: 'Beauté', price: 12500, stock: 38, status: 'Actif', description: 'Coffret complet de soins à base de karité bio : savon, baume hydratant et huile de massage. Idéal pour les peaux sèches. Fabriqué à Dakar par Atelier Téranga.', image: '', weight: 350, lowStockThreshold: 10 },
  { id: 'p-2', name: 'Boubou Ndar — Indigo', category: 'Mode', price: 28500, stock: 12, status: 'Actif', description: 'Boubou tissé à la main avec du tissu indigo traditionnel de Saint-Louis. Coupe ample, tailles M et L disponibles. Pièce unique teintée à la main.', image: '', weight: 600, lowStockThreshold: 5 },
  { id: 'p-3', name: 'Panier petit-déjeuner', category: 'Maison', price: 9500, stock: 0, status: 'Épuisé', description: 'Panier en raphis tressé main, garni de café local, miel et biscuits artisanaux. Parfait pour offrir. Édition limitée.', image: '', weight: 800, lowStockThreshold: 3 },
  { id: 'p-4', name: 'Huile de Baobab 100ml', category: 'Beauté', price: 7200, stock: 64, status: 'Brouillon', description: 'Huile pure de baobab pressée à froid. Riche en oméga 3 et 6. Nourrit les cheveux et la peau. Flacon en verre ambré.', image: '', weight: 200, lowStockThreshold: 15 },
];

export const seedCampaigns: Campaign[] = [
  { id: 'c-1', name: 'Rentrée douce — septembre', description: 'Mettez en avant vos produits de soin et de bien-être pour la rentrée. Commission attractive sur le Coffret Karité.', product: 'Coffret Soin Karité', commission: 12, commissionType: 'percentage', model: 'Commission', goal: 50, sellers: 28, sales: 46, status: 'Active', startDate: '1 sept 2024', endDate: '30 sept 2024' },
  { id: 'c-2', name: 'Le goût de chez nous', description: 'Campagne autour des produits du terroir. Mettez en avant le savoir-faire local.', product: 'Panier petit-déjeuner', commission: 1500, commissionType: 'fixed', model: 'Marge', goal: 40, sellers: 17, sales: 31, status: 'Active', startDate: '10 juin 2024', endDate: '10 août 2024' },
  { id: 'c-3', name: 'Week-end famille', description: 'Le boubou Ndar à l\'honneur pour les sorties du week-end.', product: 'Boubou Ndar — Indigo', commission: 10, commissionType: 'percentage', model: 'Commission', goal: 30, sellers: 11, sales: 22, status: 'En pause', startDate: '1 mai 2024', endDate: '30 juin 2024' },
];

export const seedOrders: Order[] = [
  { id: 'CMD-240618', customer: 'Fatou Sarr', amount: 28500, date: '18 juin, 10:42', status: 'À préparer' },
  { id: 'CMD-240617', customer: 'Moussa Diop', amount: 19700, date: '17 juin, 16:08', status: 'En livraison' },
  { id: 'CMD-240616', customer: 'Awa Ndiaye', amount: 12500, date: '16 juin, 09:24', status: 'Livrée' },
  { id: 'CMD-240615', customer: 'Khadija Ba', amount: 9500, date: '15 juin, 18:12', status: 'Livrée' },
];

export const seedZones: DeliveryZone[] = [
  ['Dakar centre', true, 1500],
  ['Almadies & Ngor', true, 2000],
  ['Pikine & Guédiawaye', true, 2000],
  ['Rufisque & Diamniadio', false, 3000],
  ['Thiès', false, 4500],
];
