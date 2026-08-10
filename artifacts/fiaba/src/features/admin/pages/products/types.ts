export type ProductRow = {
  id: string;
  name: string;
  merchant_id: string;
  niche_id: string | null;
  price: number;
  status: string;
  created_at: string;
  ai_headline: string | null;
  ai_generated_at: string | null;
  ai_generation_count: number;
};

export type CampaignRow = {
  id: string;
  name: string;
  merchant_id: string;
  model: string;
  commission: number;
  commission_type: string | null;
  status: string;
  created_at: string;
};

export type MerchantName = { id: string; name: string };
export type NicheName = { id: string; name: string };

export const productStatusToneMap: Record<string, 'mint' | 'amber' | 'rose' | 'slate'> = {
  actif: 'mint', brouillon: 'slate', epuise: 'amber',
};

export const productStatusLabelMap: Record<string, string> = {
  actif: 'Actif', brouillon: 'Brouillon', epuise: 'Épuisé',
};

export const campaignStatusToneMap: Record<string, 'mint' | 'amber' | 'rose' | 'slate'> = {
  active: 'mint', en_pause: 'amber', terminee: 'slate',
};

export const campaignStatusLabelMap: Record<string, string> = {
  active: 'Active', en_pause: 'En pause', terminee: 'Terminée',
};
