/**
 * Order attribution service.
 *
 * When a customer places an order via a seller's link, the order must be:
 *  1. Saved as a customer order (what the customer sees)
 *  2. Attributed to the seller (appears in their sales dashboard)
 *  3. Visible to the merchant (appears in their orders dashboard)
 *
 * This service bridges the three storage silos and ensures that
 * commissions are calculated correctly based on the campaign's
 * commission type (percentage or fixed).
 */

import { read, write } from './storage';
import { money } from './utils';
import { seedProducts, seedCampaigns, seedOrders } from '@/config/seeds';
import { seedSellerOrders, seedOpportunities, seedSellerCampaigns } from '@/config/seller-seeds';
import type {
  Order,
  Product,
  Campaign,
  SellerOrder,
  SellerCampaign,
  Opportunity,
} from '@/types/entities';

/* ── Types ── */

export type CheckoutOrderData = {
  id: string;
  productId: string;
  productName: string;
  merchantName: string;
  sellerId?: string;
  sellerCode?: string;
  quantity: number;
  unitPrice: number;
  zone: string;
  deliveryFee: number;
  total: number;
  customerName: string;
  phone: string;
  address: string;
  paymentMethod: string;
  paymentNumber: string;
  note: string;
  date: string;
  status: 'À préparer' | 'En livraison' | 'Livrée' | 'Annulée';
};

/* ── Attribution ── */

/**
 * Process a new order from the checkout flow.
 *
 * 1. Saves the order to the merchant's order list (with seller attribution)
 * 2. If a seller is identified, creates a seller order with commission
 * 3. Updates the seller campaign stats (sales + earnings)
 *
 * Returns the commission amount for display purposes.
 */
export function attributeOrder(orderData: CheckoutOrderData): {
  commissionAmount: number;
  sellerAttributed: boolean;
} {
  // Find the campaign and product to calculate commission
  const opportunities = read<Opportunity[]>('opportunities', seedOpportunities);
  const op = opportunities.find((o) => o.id === orderData.productId);

  const campaigns = read<Campaign[]>('campaigns', seedCampaigns);
  const campaign = campaigns.find((c) => c.product === orderData.productName);

  const sellerCampaigns = read<SellerCampaign[]>('seller-campaigns', seedSellerCampaigns);
  const sellerCampaign = sellerCampaigns.find(
    (sc) => sc.campaignId === op?.campaignId || sc.code === orderData.sellerCode
  );

  // Calculate commission
  let commissionAmount = 0;
  let sellerAttributed = false;

  if (sellerCampaign && op) {
    if (sellerCampaign.model === 'Marge') {
      // Fixed commission amount per sale
      commissionAmount = sellerCampaign.commission * orderData.quantity;
    } else {
      // Percentage commission
      commissionAmount = Math.round((orderData.unitPrice * orderData.quantity * sellerCampaign.commission) / 100);
    }
    sellerAttributed = true;
  } else if (campaign && op) {
    // Fallback: use campaign commission if seller not found
    if (campaign.model === 'Marge') {
      commissionAmount = campaign.commission * orderData.quantity;
    } else {
      commissionAmount = Math.round((orderData.unitPrice * orderData.quantity * campaign.commission) / 100);
    }
  }

  /* 1. Save to merchant orders */
  const merchantOrders = read<Order[]>('orders', seedOrders);
  const merchantOrder: Order = {
    id: orderData.id,
    customer: orderData.customerName,
    amount: orderData.total,
    date: orderData.date,
    status: orderData.status,
    sellerId: orderData.sellerId,
    sellerCode: orderData.sellerCode,
    sellerName: sellerCampaign ? sellerCampaign.campaignName : undefined,
    productName: orderData.productName,
    quantity: orderData.quantity,
    zone: orderData.zone,
    deliveryFee: orderData.deliveryFee,
    paymentMethod: orderData.paymentMethod,
    phone: orderData.phone,
    address: orderData.address,
    commissionAmount,
  };
  write('orders', [merchantOrder, ...merchantOrders]);

  /* 2. Save to seller orders (if attributed) */
  if (sellerAttributed && sellerCampaign) {
    const sellerOrders = read<SellerOrder[]>('seller-orders', seedSellerOrders);
    const sellerOrder: SellerOrder = {
      id: orderData.id,
      customer: orderData.customerName,
      product: orderData.productName,
      amount: orderData.total,
      commission: commissionAmount,
      date: orderData.date,
      status: 'En cours',
    };
    write('seller-orders', [sellerOrder, ...sellerOrders]);

    /* 3. Update seller campaign stats */
    const updatedSellerCampaigns = sellerCampaigns.map((sc) =>
      sc.id === sellerCampaign.id
        ? {
            ...sc,
            sales: sc.sales + 1,
            earnings: sc.earnings + commissionAmount,
          }
        : sc
    );
    write('seller-campaigns', updatedSellerCampaigns);

    /* 4. Update merchant campaign stats */
    const updatedCampaigns = campaigns.map((c) =>
      c.id === sellerCampaign.campaignId
        ? { ...c, sales: c.sales + 1 }
        : c
    );
    write('campaigns', updatedCampaigns);
  }

  return { commissionAmount, sellerAttributed };
}

/**
 * Track a click on a seller's link.
 * Increments the click counter on the seller campaign.
 */
export function trackClick(campaignId: string, sellerCode?: string): void {
  const sellerCampaigns = read<SellerCampaign[]>('seller-campaigns', seedSellerCampaigns);
  const updated = sellerCampaigns.map((sc) => {
    if (sc.campaignId === campaignId && (!sellerCode || sc.code === sellerCode)) {
      return { ...sc, clicks: sc.clicks + 1 };
    }
    return sc;
  });
  write('seller-campaigns', updated);
}

/**
 * Look up a seller campaign by code.
 * Used when a customer manually enters a seller code at checkout.
 */
export function findSellerByCode(code: string): SellerCampaign | null {
  const sellerCampaigns = read<SellerCampaign[]>('seller-campaigns', seedSellerCampaigns);
  const normalized = code.trim().toUpperCase();
  return sellerCampaigns.find((sc) => sc.code.toUpperCase() === normalized) ?? null;
}
