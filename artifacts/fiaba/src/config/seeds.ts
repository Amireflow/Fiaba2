import type { Product, Campaign, Order, DeliveryZone } from '@/types/entities';

export const seedProducts: Product[] = [
  { id: 'p-1', name: 'Coffret Soin Karité', category: 'Beauté', price: 12500, stock: 38, status: 'Actif' },
  { id: 'p-2', name: 'Boubou Ndar — Indigo', category: 'Mode', price: 28500, stock: 12, status: 'Actif' },
  { id: 'p-3', name: 'Panier petit-déjeuner', category: 'Maison', price: 9500, stock: 0, status: 'Épuisé' },
  { id: 'p-4', name: 'Huile de Baobab 100ml', category: 'Beauté', price: 7200, stock: 64, status: 'Brouillon' },
];

export const seedCampaigns: Campaign[] = [
  { id: 'c-1', name: 'Rentrée douce — septembre', commission: 12, sellers: 28, sales: 46, status: 'Active' },
  { id: 'c-2', name: 'Le goût de chez nous', commission: 10, sellers: 17, sales: 31, status: 'Active' },
  { id: 'c-3', name: 'Week-end famille', commission: 8, sellers: 11, sales: 22, status: 'En pause' },
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
