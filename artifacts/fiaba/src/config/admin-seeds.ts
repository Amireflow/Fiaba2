import type {
  AdminCampaign,
  AdminCommission,
  AdminCountrySetting,
  AdminDispute,
  AdminFraudAlert,
  AdminNiche,
  AdminOrder,
  AdminPayout,
  AdminProduct,
  AdminUser,
  AdminZone,
} from '@/types/entities';

export const seedAdminUsers: AdminUser[] = [
  { id: 'u-1', name: 'Aminata Ndiaye', phone: '+221 77 123 45 67', email: 'aminata@maisonndar.sn', role: 'marchand', city: 'Dakar', status: 'Vérifié', joinedDate: '12 jan 2024', trustScore: 92, sales: 184, disputes: 1 },
  { id: 'u-2', name: 'Marième Fall', phone: '+221 77 482 19 06', email: 'marieme.fall@gmail.com', role: 'vendeur', city: 'Dakar', status: 'Vérifié', joinedDate: '15 mars 2024', trustScore: 82, sales: 42, disputes: 0 },
  { id: 'u-3', name: 'Moussa Diop', phone: '+221 76 555 12 34', email: 'moussa.diop@yahoo.fr', role: 'vendeur', city: 'Pikine', status: 'En attente', joinedDate: '02 juin 2024', trustScore: 64, sales: 0, disputes: 0 },
  { id: 'u-4', name: 'Saveurs du Sénégal', phone: '+221 33 821 00 11', email: 'contact@saveurs.sn', role: 'marchand', city: 'Thiès', status: 'Vérifié', joinedDate: '28 fév 2024', trustScore: 88, sales: 96, disputes: 2 },
  { id: 'u-5', name: 'Ndeye Kébé', phone: '+221 78 901 23 45', email: 'ndeye.kebe@gmail.com', role: 'vendeur', city: 'Rufisque', status: 'Vérifié', joinedDate: '22 mars 2024', trustScore: 76, sales: 31, disputes: 1 },
  { id: 'u-6', name: 'Ousmane Diop', phone: '+221 77 444 55 66', email: 'ousmane.d@outlook.com', role: 'vendeur', city: 'Pikine', status: 'Suspendu', joinedDate: '10 mai 2024', trustScore: 38, sales: 5, disputes: 3 },
  { id: 'u-7', name: 'Atelier Dakar', phone: '+221 77 222 33 44', email: 'bonjour@atelierdakar.sn', role: 'marchand', city: 'Dakar', status: 'En attente', joinedDate: '18 juin 2024', trustScore: 0, sales: 0, disputes: 0 },
  { id: 'u-8', name: 'Saliou Kane', phone: '+221 76 333 88 99', email: 'saliou.kane@gmail.com', role: 'vendeur', city: 'Thiès', status: 'Vérifié', joinedDate: '03 avril 2024', trustScore: 71, sales: 24, disputes: 0 },
];

export const seedAdminProducts: AdminProduct[] = [
  { id: 'p-1', name: 'Coffret Soin Karité', merchant: 'Maison Ndar', category: 'Beauté', price: 12500, status: 'Actif', reported: false, createdAt: '10 mars 2024' },
  { id: 'p-2', name: 'Boubou Ndar — Indigo', merchant: 'Maison Ndar', category: 'Mode', price: 28500, status: 'Actif', reported: false, createdAt: '12 mars 2024' },
  { id: 'p-3', name: 'Tisane Bissap Premium', merchant: 'Saveurs du Sénégal', category: 'Épicerie', price: 5500, status: 'Actif', reported: true, createdAt: '01 avril 2024' },
  { id: 'p-4', name: 'Sac en cuir artisanal', merchant: 'Atelier Dakar', category: 'Mode', price: 18500, status: 'Suspendu', reported: true, createdAt: '20 mai 2024' },
  { id: 'p-5', name: 'Huile de Baobab 100ml', merchant: 'Maison Ndar', category: 'Beauté', price: 7200, status: 'Actif', reported: false, createdAt: '05 avril 2024' },
];

export const seedAdminCampaigns: AdminCampaign[] = [
  { id: 'c-1', name: 'Rentrée douce — septembre', merchant: 'Maison Ndar', model: 'Commission', commission: 12, sellers: 28, sales: 46, status: 'Active', createdAt: '01 sept 2024' },
  { id: 'c-2', name: 'Le goût de chez nous', merchant: 'Saveurs du Sénégal', model: 'Commission', commission: 10, sellers: 17, sales: 31, status: 'Active', createdAt: '15 mars 2024' },
  { id: 'c-3', name: 'Week-end famille', merchant: 'Maison Ndar', model: 'Marge', commission: 8, sellers: 11, sales: 22, status: 'En pause', createdAt: '20 avril 2024' },
  { id: 'c-4', name: 'Cuir & savoir-faire', merchant: 'Atelier Dakar', model: 'Marge', commission: 18, sellers: 6, sales: 9, status: 'Suspendue', createdAt: '01 juin 2024' },
];

export const seedAdminOrders: AdminOrder[] = [
  { id: 'CMD-240618', customer: 'Fatou Sarr', seller: 'Marième Fall', merchant: 'Maison Ndar', amount: 28500, zone: 'Dakar', date: '18 juin, 10:42', status: 'En livraison', paymentMethod: 'COD' },
  { id: 'CMD-240617', customer: 'Moussa Diop', seller: 'Ndeye Kébé', merchant: 'Saveurs du Sénégal', amount: 19700, zone: 'Rufisque', date: '17 juin, 16:08', status: 'Livrée', paymentMethod: 'Wave' },
  { id: 'CMD-240616', customer: 'Awa Ndiaye', seller: 'Marième Fall', merchant: 'Maison Ndar', amount: 12500, zone: 'Dakar', date: '16 juin, 09:24', status: 'Payée', paymentMethod: 'Orange Money' },
  { id: 'CMD-240615', customer: 'Khadija Ba', seller: 'Saliou Kane', merchant: 'Maison Ndar', amount: 9500, zone: 'Thiès', date: '15 juin, 18:12', status: 'Litige', paymentMethod: 'COD' },
  { id: 'CMD-240614', customer: 'Ibrahima Sow', seller: 'Ousmane Diop', merchant: 'Atelier Dakar', amount: 18500, zone: 'Pikine', date: '14 juin, 14:30', status: 'Refusée', paymentMethod: 'COD' },
  { id: 'CMD-240613', customer: 'Aïssatou Diallo', seller: 'Marième Fall', merchant: 'Maison Ndar', amount: 12500, zone: 'Dakar', date: '13 juin, 11:05', status: 'Annulée', paymentMethod: 'COD' },
];

export const seedAdminCommissions: AdminCommission[] = [
  { id: 'cm-1', orderId: 'CMD-240616', seller: 'Marième Fall', merchant: 'Maison Ndar', model: 'Commission', amount: 1500, status: 'Disponible', date: '16 juin 2024' },
  { id: 'cm-2', orderId: 'CMD-240617', seller: 'Ndeye Kébé', merchant: 'Saveurs du Sénégal', model: 'Commission', amount: 1970, status: 'En attente', date: '17 juin 2024' },
  { id: 'cm-3', orderId: 'CMD-240615', seller: 'Saliou Kane', merchant: 'Maison Ndar', model: 'Commission', amount: 1140, status: 'Reprise', date: '15 juin 2024' },
  { id: 'cm-4', orderId: 'CMD-240612', seller: 'Marième Fall', merchant: 'Maison Ndar', model: 'Commission', amount: 1500, status: 'Versée', date: '10 juin 2024' },
  { id: 'cm-5', orderId: 'CMD-240611', seller: 'Ndeye Kébé', merchant: 'Saveurs du Sénégal', model: 'Marge', amount: 3200, status: 'Disponible', date: '08 juin 2024' },
];

export const seedAdminPayouts: AdminPayout[] = [
  { id: 'pw-1', seller: 'Marième Fall', amount: 20500, account: 'Wave · · · 38 42', status: 'Demandée', date: '19 juin 2024' },
  { id: 'pw-2', seller: 'Ndeye Kébé', amount: 12000, account: 'Orange Money · · · 11 07', status: 'En traitement', date: '18 juin 2024' },
  { id: 'pw-3', seller: 'Saliou Kane', amount: 8500, account: 'Wave · · · 71 23', status: 'Versée', date: '14 juin 2024' },
  { id: 'pw-4', seller: 'Ousmane Diop', amount: 4200, account: 'Orange Money · · · 55 90', status: 'Refusée', date: '12 juin 2024' },
];

export const seedAdminDisputes: AdminDispute[] = [
  { id: 'd-1', orderId: 'CMD-240615', party: 'Khadija Ba (client)', reason: 'Produit non conforme à la photo', openedDate: '15 juin 2024', status: 'En revue', amount: 9500 },
  { id: 'd-2', orderId: 'CMD-240614', party: 'Atelier Dakar (marchand)', reason: 'Refus de réception injustifié', openedDate: '14 juin 2024', status: 'Ouvert', amount: 18500 },
  { id: 'd-3', orderId: 'CMD-240608', party: 'Marième Fall (vendeur)', reason: 'Commission non créditée', openedDate: '10 juin 2024', status: 'Résolu', amount: 1500 },
  { id: 'd-4', orderId: 'CMD-240601', party: 'Saveurs du Sénégal (marchand)', reason: 'Retour après livraison', openedDate: '05 juin 2024', status: 'Fermé', amount: 5500 },
];

export const seedAdminFraudAlerts: AdminFraudAlert[] = [
  { id: 'f-1', type: 'Auto-commande', target: 'Ousmane Diop', detail: 'Commande vers même téléphone que le vendeur', severity: 'Élevé', status: 'En revue', date: '14 juin 2024' },
  { id: 'f-2', type: 'Multi-comptes', target: '+221 77 444 55 66', detail: '3 comptes liés au même numéro', severity: 'Critique', status: 'Nouveau', date: '13 juin 2024' },
  { id: 'f-3', type: 'Refus anormal', target: 'Ousmane Diop', detail: 'Taux de refus 41% (seuil 15%)', severity: 'Élevé', status: 'Bloqué', date: '12 juin 2024' },
  { id: 'f-4', type: 'Retrait suspect', target: 'Ndeye Kébé', detail: 'Retrait demandé 2h après disponibilité', severity: 'Moyen', status: 'Ignoré', date: '11 juin 2024' },
  { id: 'f-5', type: 'Tracking suspect', target: 'CMD-240610', detail: 'Clic et commande sous 4 secondes', severity: 'Moyen', status: 'En revue', date: '10 juin 2024' },
];

export const seedAdminZones: AdminZone[] = [
  { id: 'z-1', name: 'Dakar', level: 'Région', parent: '—', active: true, communes: 19 },
  { id: 'z-2', name: 'Thiès', level: 'Région', parent: '—', active: true, communes: 12 },
  { id: 'z-3', name: 'Saint-Louis', level: 'Région', parent: '—', active: true, communes: 11 },
  { id: 'z-4', name: 'Dakar', level: 'Département', parent: 'Dakar', active: true, communes: 4 },
  { id: 'z-5', name: 'Pikine', level: 'Département', parent: 'Dakar', active: true, communes: 3 },
  { id: 'z-6', name: 'Guédiawaye', level: 'Département', parent: 'Dakar', active: true, communes: 3 },
  { id: 'z-7', name: 'Rufisque', level: 'Département', parent: 'Dakar', active: true, communes: 5 },
  { id: 'z-8', name: 'Almadies', level: 'Commune', parent: 'Dakar', active: true, communes: 0 },
  { id: 'z-9', name: 'Parcelles Assainies', level: 'Commune', parent: 'Dakar', active: true, communes: 0 },
  { id: 'z-10', name: 'Grand Yoff', level: 'Commune', parent: 'Dakar', active: true, communes: 0 },
  { id: 'z-11', name: 'Mermoz', level: 'Commune', parent: 'Dakar', active: false, communes: 0 },
];

export const seedAdminNiches: AdminNiche[] = [
  { id: 'n-1', name: 'Beauté', type: 'Catégorie', parent: '—', tags: ['karité', 'soin', 'naturel'], sellers: 142, products: 38, active: true },
  { id: 'n-2', name: 'Mode', type: 'Catégorie', parent: '—', tags: ['boubou', 'cuir', 'accessoires'], sellers: 118, products: 52, active: true },
  { id: 'n-3', name: 'Maison', type: 'Catégorie', parent: '—', tags: ['déco', 'cuisine'], sellers: 64, products: 21, active: true },
  { id: 'n-4', name: 'Épicerie', type: 'Catégorie', parent: '—', tags: ['bissap', 'local'], sellers: 47, products: 18, active: true },
  { id: 'n-5', name: 'Tech', type: 'Catégorie', parent: '—', tags: ['smartphone', 'accessoires'], sellers: 22, products: 9, active: false },
  { id: 'n-6', name: 'Smartphones', type: 'Sous-niche', parent: 'Tech', tags: ['iPhone', 'Android'], sellers: 14, products: 5, active: true },
  { id: 'n-7', name: 'Soins naturels', type: 'Sous-niche', parent: 'Beauté', tags: ['karité', 'baobab'], sellers: 89, products: 22, active: true },
];

export const seedAdminSettings: AdminCountrySetting[] = [
  { key: 'country', label: 'Pays pilote', value: 'Sénégal', category: 'Pays', status: 'Actif' },
  { key: 'currency', label: 'Devise', value: 'FCFA (XOF)', category: 'Pays', status: 'Actif' },
  { key: 'platform-fee', label: 'Frais de plateforme', value: '5% par vente validée', category: 'Frais', status: 'Actif' },
  { key: 'safety-period', label: 'Période de sécurité', value: '7 jours après livraison', category: 'Frais', status: 'Actif' },
  { key: 'cod-limit', label: 'Plafond COD', value: '75 000 F par commande', category: 'Frais', status: 'Actif' },
  { key: 'wave', label: 'Wave', value: 'API connectée · Sénégal', category: 'Intégration', status: 'Actif' },
  { key: 'orange-money', label: 'Orange Money', value: 'API connectée · Sénégal', category: 'Intégration', status: 'Actif' },
  { key: 'whatsapp', label: 'WhatsApp Business', value: 'Template API configuré', category: 'Intégration', status: 'Actif' },
  { key: 'sms', label: 'SMS provider', value: 'Non configuré', category: 'Intégration', status: 'À configurer' },
  { key: 'logistics', label: 'Partenaire logistique', value: 'En négociation', category: 'Intégration', status: 'À configurer' },
];
