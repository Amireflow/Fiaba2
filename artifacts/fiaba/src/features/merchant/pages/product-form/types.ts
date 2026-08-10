export const physicalCategories = [
  'Beauté & Cosmétiques',
  'Mode & Vêtements',
  'Maison & Déco',
  'Épicerie & Terroir',
  'High-Tech & Accessoires',
  'Sport & Fitness',
  'Bijoux & Accessoires',
  'Enfants & Bébé',
] as const;

export const digitalCategories = [
  'Ebooks & Guides',
  'Formations & Cours',
  'Templates & Modèles',
  'Logiciels & Apps',
  'Musique & Audio',
  'Art & Design',
  'Accès VIP & Communauté',
  'Coaching & Consulting',
] as const;

export type WizardStep = 1 | 2 | 3;

export type FormState = {
  name: string;
  category: string;
  sku: string;
  price: string;
  stock: string;
  lowStockThreshold: string;
  description: string;
  images: string[];
  type: 'physique' | 'digital';
  digital_file_url: string;
  digital_access_instructions: string;
};

export const emptyForm: FormState = {
  name: '',
  category: physicalCategories[0],
  sku: '',
  price: '',
  stock: '10',
  lowStockThreshold: '3',
  description: '',
  images: [],
  type: 'physique',
  digital_file_url: '',
  digital_access_instructions: '',
};

export type AiPreview = {
  headline: string;
  benefits: { icon: string; title: string; text: string }[];
  faq: { question: string; answer: string }[];
  cta_text: string;
} | null;
