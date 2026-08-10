export type ProductData = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  type: 'physique' | 'digital' | null;
  merchant_id: string;
  merchant_name: string;
  ai_headline: string | null;
  ai_benefits: { icon: string; title: string; text: string }[] | null;
  ai_faq: { question: string; answer: string }[] | null;
  ai_cta_text: string | null;
  campaign_id: string | null;
};

export type SellerAttribution = {
  sellerId: string;
  sellerCode: string;
  trackingLinkId: string;
} | null;
