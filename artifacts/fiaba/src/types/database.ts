// Types générés manuellement depuis le schéma Supabase de Fiaba.
// Pour régénérer automatiquement : `supabase gen types typescript --local > src/types/database.ts`

export type UserRole = 'marchand' | 'vendeur' | 'admin';
export type ProductStatus = 'actif' | 'brouillon' | 'epuise';
export type CampaignStatus = 'active' | 'en_pause' | 'terminee';
export type OrderStatus = 'a_preparer' | 'en_livraison' | 'livree' | 'annulee';
export type OrderStatusV2 =
  | 'created' | 'pending_confirmation' | 'confirmed' | 'processing'
  | 'shipped' | 'out_for_delivery' | 'delivered' | 'payment_confirmed'
  | 'commission_pending' | 'commission_available'
  | 'cancelled' | 'refused' | 'returned' | 'fraud' | 'disputed';
export type PaymentStatus = 'en_attente' | 'disponible' | 'verse' | 'echoue';
export type PaymentMethod = 'wave' | 'orange_money' | 'cash' | 'card';
export type DeliveryStatus = 'en_preparation' | 'en_cours' | 'livree' | 'echoue';
export type NotificationType = 'commande' | 'vendeur' | 'paiement' | 'campagne' | 'systeme';
export type SellerStatus = 'invite' | 'actif' | 'suspendu';
export type CommissionModel = 'commission' | 'marge';
export type CommissionType = 'percentage' | 'fixed';
export type CommissionStatus = 'pending' | 'available' | 'paid' | 'reversed';
export type PayoutStatus = 'requested' | 'processing' | 'paid' | 'refused';
export type PayoutAccountType = 'wave' | 'orange_money' | 'bank' | 'cash';
export type DisputeStatus = 'open' | 'in_review' | 'resolved' | 'closed';
export type FraudSeverity = 'critical' | 'high' | 'medium';
export type FraudStatus = 'new' | 'in_review' | 'blocked' | 'ignored';
export type ZoneLevel = 'region' | 'department' | 'commune';
export type NicheType = 'category' | 'sub_niche';
export type VerificationStatus = 'verified' | 'pending' | 'refused' | 'suspended';
export type AnalyticsEvent =
  | 'signup_started' | 'signup_completed' | 'niche_selected'
  | 'product_viewed' | 'campaign_viewed' | 'campaign_joined'
  | 'share_clicked' | 'tracking_link_clicked' | 'zone_coverage_checked'
  | 'checkout_started' | 'order_created' | 'order_confirmed'
  | 'order_shipped' | 'order_delivered' | 'payment_confirmed'
  | 'sale_validated' | 'commission_created' | 'margin_created'
  | 'payout_requested' | 'payout_completed'
  | 'order_refused' | 'order_returned';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string;
          phone: string | null;
          email: string | null;
          avatar_url: string | null;
          city: string | null;
          bio: string | null;
          verification_status: VerificationStatus;
          trust_score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          full_name?: string;
          phone?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          city?: string | null;
          bio?: string | null;
          verification_status?: VerificationStatus;
          trust_score?: number;
        };
        Update: {
          id?: string;
          role?: UserRole;
          full_name?: string;
          phone?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          city?: string | null;
          bio?: string | null;
          verification_status?: VerificationStatus;
          trust_score?: number;
        };
      };
      merchants: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          description: string;
          logo_url: string | null;
          phone: string | null;
          email: string | null;
          city: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          description?: string;
          logo_url?: string | null;
          phone?: string | null;
          email?: string | null;
          city?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          slug?: string;
          description?: string;
          logo_url?: string | null;
          phone?: string | null;
          email?: string | null;
          city?: string;
          is_active?: boolean;
        };
      };
      sellers: {
        Row: {
          id: string;
          merchant_id: string | null;
          profile_id: string | null;
          display_name: string;
          phone: string | null;
          followers: number;
          status: SellerStatus;
          invited_at: string;
          joined_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          merchant_id?: string | null;
          profile_id?: string | null;
          display_name: string;
          phone?: string | null;
          followers?: number;
          status?: SellerStatus;
          joined_at?: string | null;
        };
        Update: {
          id?: string;
          merchant_id?: string | null;
          profile_id?: string | null;
          display_name?: string;
          phone?: string | null;
          followers?: number;
          status?: SellerStatus;
          joined_at?: string | null;
        };
      };
      products: {
        Row: {
          id: string;
          merchant_id: string;
          name: string;
          category: string;
          description: string;
          price: number;
          stock: number;
          image_url: string | null;
          status: ProductStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          name: string;
          category?: string;
          description?: string;
          price: number;
          stock?: number;
          image_url?: string | null;
          status?: ProductStatus;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          name?: string;
          category?: string;
          description?: string;
          price?: number;
          stock?: number;
          image_url?: string | null;
          status?: ProductStatus;
        };
      };
      campaigns: {
        Row: {
          id: string;
          merchant_id: string;
          name: string;
          description: string;
          commission: number;
          product_id: string | null;
          model: CommissionModel;
          commission_type: CommissionType;
          goal: number | null;
          niche_id: string | null;
          starts_at: string | null;
          ends_at: string | null;
          status: CampaignStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          name: string;
          description?: string;
          commission?: number;
          product_id?: string | null;
          model?: CommissionModel;
          commission_type?: CommissionType;
          goal?: number | null;
          niche_id?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          status?: CampaignStatus;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          name?: string;
          description?: string;
          commission?: number;
          product_id?: string | null;
          model?: CommissionModel;
          commission_type?: CommissionType;
          goal?: number | null;
          niche_id?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          status?: CampaignStatus;
        };
      };
      campaign_sellers: {
        Row: {
          id: string;
          campaign_id: string;
          seller_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          seller_id: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          seller_id?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          merchant_id: string;
          seller_id: string | null;
          campaign_id: string | null;
          customer_name: string;
          customer_phone: string | null;
          customer_address: string | null;
          total_amount: number;
          commission_amount: number;
          status: OrderStatus;
          status_v2: OrderStatusV2;
          zone_id: string | null;
          zone_name: string | null;
          delivery_fee: number;
          payment_method: PaymentMethod;
          seller_price: number | null;
          merchant_amount: number | null;
          platform_fee: number;
          commission_model: CommissionModel | null;
          commission_type: CommissionType | null;
          commission_rate: number | null;
          snapshot_product_price: number | null;
          snapshot_commission_amount: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          seller_id?: string | null;
          campaign_id?: string | null;
          customer_name: string;
          customer_phone?: string | null;
          customer_address?: string | null;
          total_amount: number;
          commission_amount?: number;
          status?: OrderStatus;
          status_v2?: OrderStatusV2;
          zone_id?: string | null;
          zone_name?: string | null;
          delivery_fee?: number;
          payment_method?: PaymentMethod;
          seller_price?: number | null;
          merchant_amount?: number | null;
          platform_fee?: number;
          commission_model?: CommissionModel | null;
          commission_type?: CommissionType | null;
          commission_rate?: number | null;
          snapshot_product_price?: number | null;
          snapshot_commission_amount?: number | null;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          seller_id?: string | null;
          campaign_id?: string | null;
          customer_name?: string;
          customer_phone?: string | null;
          customer_address?: string | null;
          total_amount?: number;
          commission_amount?: number;
          status?: OrderStatus;
          status_v2?: OrderStatusV2;
          zone_id?: string | null;
          zone_name?: string | null;
          delivery_fee?: number;
          payment_method?: PaymentMethod;
          seller_price?: number | null;
          merchant_amount?: number | null;
          platform_fee?: number;
          commission_model?: CommissionModel | null;
          commission_type?: CommissionType | null;
          commission_rate?: number | null;
          snapshot_product_price?: number | null;
          snapshot_commission_amount?: number | null;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          unit_price: number;
          quantity: number;
          line_total: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          unit_price: number;
          quantity: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          unit_price?: number;
          quantity?: number;
        };
      };
      deliveries: {
        Row: {
          id: string;
          order_id: string;
          zone_id: string | null;
          carrier: string | null;
          tracking_code: string | null;
          status: DeliveryStatus;
          fee: number;
          shipped_at: string | null;
          delivered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          zone_id?: string | null;
          carrier?: string | null;
          tracking_code?: string | null;
          status?: DeliveryStatus;
          fee?: number;
          shipped_at?: string | null;
          delivered_at?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          zone_id?: string | null;
          carrier?: string | null;
          tracking_code?: string | null;
          status?: DeliveryStatus;
          fee?: number;
          shipped_at?: string | null;
          delivered_at?: string | null;
        };
      };
      delivery_zones: {
        Row: {
          id: string;
          merchant_id: string;
          name: string;
          fee: number;
          is_active: boolean;
          zone_ref_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          name: string;
          fee?: number;
          is_active?: boolean;
          zone_ref_id?: string | null;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          name?: string;
          fee?: number;
          is_active?: boolean;
          zone_ref_id?: string | null;
        };
      };
      payments: {
        Row: {
          id: string;
          merchant_id: string;
          amount: number;
          method: PaymentMethod;
          status: PaymentStatus;
          reference: string | null;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          amount: number;
          method?: PaymentMethod;
          status?: PaymentStatus;
          reference?: string | null;
          paid_at?: string | null;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          amount?: number;
          method?: PaymentMethod;
          status?: PaymentStatus;
          reference?: string | null;
          paid_at?: string | null;
        };
      };
      commissions: {
        Row: {
          id: string;
          seller_id: string;
          order_id: string;
          campaign_id: string | null;
          amount: number;
          model: CommissionModel;
          status: CommissionStatus;
          is_paid: boolean;
          paid_at: string | null;
          available_at: string | null;
          reversed_at: string | null;
          reversal_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          order_id: string;
          campaign_id?: string | null;
          amount: number;
          model?: CommissionModel;
          status?: CommissionStatus;
          is_paid?: boolean;
          paid_at?: string | null;
          available_at?: string | null;
          reversed_at?: string | null;
          reversal_reason?: string | null;
        };
        Update: {
          id?: string;
          seller_id?: string;
          order_id?: string;
          campaign_id?: string | null;
          amount?: number;
          model?: CommissionModel;
          status?: CommissionStatus;
          is_paid?: boolean;
          paid_at?: string | null;
          available_at?: string | null;
          reversed_at?: string | null;
          reversal_reason?: string | null;
        };
      };
      reviews: {
        Row: {
          id: string;
          order_id: string | null;
          product_id: string | null;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id?: string | null;
          product_id?: string | null;
          rating: number;
          comment?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string | null;
          product_id?: string | null;
          rating?: number;
          comment?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body: string | null;
          link: string | null;
          is_read: boolean;
          data: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type?: NotificationType;
          title: string;
          body?: string | null;
          link?: string | null;
          is_read?: boolean;
          data?: Record<string, unknown> | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: NotificationType;
          title?: string;
          body?: string | null;
          link?: string | null;
          is_read?: boolean;
          data?: Record<string, unknown> | null;
        };
      };
      zones: {
        Row: {
          id: string;
          name: string;
          level: ZoneLevel;
          parent_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          level: ZoneLevel;
          parent_id?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          level?: ZoneLevel;
          parent_id?: string | null;
          is_active?: boolean;
        };
      };
      merchant_zone_coverage: {
        Row: {
          id: string;
          merchant_id: string;
          zone_id: string;
          fee: number;
          free_above: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          zone_id: string;
          fee?: number;
          free_above?: number | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          zone_id?: string;
          fee?: number;
          free_above?: number | null;
          is_active?: boolean;
        };
      };
      niches: {
        Row: {
          id: string;
          name: string;
          type: NicheType;
          parent_id: string | null;
          tags: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type?: NicheType;
          parent_id?: string | null;
          tags?: string[];
          is_active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          type?: NicheType;
          parent_id?: string | null;
          tags?: string[];
          is_active?: boolean;
        };
      };
      seller_niches: {
        Row: {
          id: string;
          seller_id: string;
          niche_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          niche_id: string;
        };
        Update: {
          id?: string;
          seller_id?: string;
          niche_id?: string;
        };
      };
      product_niches: {
        Row: {
          id: string;
          product_id: string;
          niche_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          niche_id: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          niche_id?: string;
        };
      };
      seller_profiles: {
        Row: {
          id: string;
          profile_id: string;
          display_name: string;
          bio: string | null;
          city: string | null;
          followers: number;
          reputation: number;
          audience_type: string | null;
          social_links: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          display_name: string;
          bio?: string | null;
          city?: string | null;
          followers?: number;
          reputation?: number;
          audience_type?: string | null;
          social_links?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          profile_id?: string;
          display_name?: string;
          bio?: string | null;
          city?: string | null;
          followers?: number;
          reputation?: number;
          audience_type?: string | null;
          social_links?: Record<string, unknown>;
        };
      };
      tracking_links: {
        Row: {
          id: string;
          seller_id: string;
          campaign_id: string;
          token: string;
          seller_code: string;
          signature: string;
          expires_at: string | null;
          is_active: boolean;
          clicks: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          campaign_id: string;
          token: string;
          seller_code: string;
          signature: string;
          expires_at?: string | null;
          is_active?: boolean;
          clicks?: number;
        };
        Update: {
          id?: string;
          seller_id?: string;
          campaign_id?: string;
          token?: string;
          seller_code?: string;
          signature?: string;
          expires_at?: string | null;
          is_active?: boolean;
          clicks?: number;
        };
      };
      clicks: {
        Row: {
          id: string;
          tracking_link_id: string;
          ip_address: string | null;
          user_agent: string | null;
          referrer: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tracking_link_id: string;
          ip_address?: string | null;
          user_agent?: string | null;
          referrer?: string | null;
        };
        Update: {
          id?: string;
          tracking_link_id?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          referrer?: string | null;
        };
      };
      payouts: {
        Row: {
          id: string;
          seller_id: string;
          amount: number;
          account_type: PayoutAccountType;
          account_number: string | null;
          status: PayoutStatus;
          reference: string | null;
          processed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          amount: number;
          account_type?: PayoutAccountType;
          account_number?: string | null;
          status?: PayoutStatus;
          reference?: string | null;
          processed_at?: string | null;
        };
        Update: {
          id?: string;
          seller_id?: string;
          amount?: number;
          account_type?: PayoutAccountType;
          account_number?: string | null;
          status?: PayoutStatus;
          reference?: string | null;
          processed_at?: string | null;
        };
      };
      ledger_entries: {
        Row: {
          id: string;
          seller_id: string | null;
          merchant_id: string | null;
          order_id: string | null;
          commission_id: string | null;
          payout_id: string | null;
          entry_type: string;
          amount: number;
          balance_after: number | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          seller_id?: string | null;
          merchant_id?: string | null;
          order_id?: string | null;
          commission_id?: string | null;
          payout_id?: string | null;
          entry_type: string;
          amount: number;
          balance_after?: number | null;
          description?: string | null;
        };
        Update: {
          id?: string;
          seller_id?: string | null;
          merchant_id?: string | null;
          order_id?: string | null;
          commission_id?: string | null;
          payout_id?: string | null;
          entry_type?: string;
          amount?: number;
          balance_after?: number | null;
          description?: string | null;
        };
      };
      disputes: {
        Row: {
          id: string;
          order_id: string;
          opened_by: string | null;
          party: string;
          reason: string;
          amount: number;
          status: DisputeStatus;
          resolution: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          opened_by?: string | null;
          party: string;
          reason: string;
          amount?: number;
          status?: DisputeStatus;
          resolution?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          opened_by?: string | null;
          party?: string;
          reason?: string;
          amount?: number;
          status?: DisputeStatus;
          resolution?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
        };
      };
      fraud_signals: {
        Row: {
          id: string;
          signal_type: string;
          target_user: string | null;
          target_order: string | null;
          detail: string | null;
          severity: FraudSeverity;
          status: FraudStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          signal_type: string;
          target_user?: string | null;
          target_order?: string | null;
          detail?: string | null;
          severity?: FraudSeverity;
          status?: FraudStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
        };
        Update: {
          id?: string;
          signal_type?: string;
          target_user?: string | null;
          target_order?: string | null;
          detail?: string | null;
          severity?: FraudSeverity;
          status?: FraudStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Record<string, unknown> | null;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          action?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Record<string, unknown> | null;
        };
      };
      country_settings: {
        Row: {
          id: string;
          key: string;
          label: string;
          value: string;
          category: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          label: string;
          value: string;
          category?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          key?: string;
          label?: string;
          value?: string;
          category?: string;
          is_active?: boolean;
        };
      };
      analytics_events: {
        Row: {
          id: string;
          event_type: AnalyticsEvent;
          user_id: string | null;
          entity_type: string | null;
          entity_id: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_type: AnalyticsEvent;
          user_id?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Record<string, unknown> | null;
        };
        Update: {
          id?: string;
          event_type?: AnalyticsEvent;
          user_id?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Record<string, unknown> | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_merchant_owner: {
        Args: { merchant_uuid: string };
        Returns: boolean;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_seller: {
        Args: { seller_uuid: string };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      product_status: ProductStatus;
      campaign_status: CampaignStatus;
      order_status: OrderStatus;
      order_status_v2: OrderStatusV2;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
      delivery_status: DeliveryStatus;
      notification_type: NotificationType;
      seller_status: SellerStatus;
      commission_model: CommissionModel;
      commission_type: CommissionType;
      commission_status: CommissionStatus;
      payout_status: PayoutStatus;
      payout_account_type: PayoutAccountType;
      dispute_status: DisputeStatus;
      fraud_severity: FraudSeverity;
      fraud_status: FraudStatus;
      zone_level: ZoneLevel;
      niche_type: NicheType;
      verification_status: VerificationStatus;
      analytics_event: AnalyticsEvent;
    };
  };
}
