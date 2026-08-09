// Types générés manuellement depuis le schéma Supabase de Fiaba.
// Pour régénérer automatiquement : `supabase gen types typescript --local > src/types/database.ts`

export type UserRole = 'marchand' | 'vendeur' | 'admin';
export type ProductStatus = 'actif' | 'brouillon' | 'epuise';
export type CampaignStatus = 'active' | 'en_pause' | 'terminee';
export type OrderStatus = 'a_preparer' | 'en_livraison' | 'livree' | 'annulee';
export type PaymentStatus = 'en_attente' | 'disponible' | 'verse' | 'echoue';
export type PaymentMethod = 'wave' | 'orange_money' | 'cash' | 'card';
export type DeliveryStatus = 'en_preparation' | 'en_cours' | 'livree' | 'echoue';
export type NotificationType = 'commande' | 'vendeur' | 'paiement' | 'campagne' | 'systeme';
export type SellerStatus = 'invite' | 'actif' | 'suspendu';

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
          merchant_id: string;
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
          merchant_id: string;
          profile_id?: string | null;
          display_name: string;
          phone?: string | null;
          followers?: number;
          status?: SellerStatus;
          joined_at?: string | null;
        };
        Update: {
          id?: string;
          merchant_id?: string;
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          name: string;
          fee?: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          name?: string;
          fee?: number;
          is_active?: boolean;
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
          is_paid: boolean;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          order_id: string;
          campaign_id?: string | null;
          amount: number;
          is_paid?: boolean;
          paid_at?: string | null;
        };
        Update: {
          id?: string;
          seller_id?: string;
          order_id?: string;
          campaign_id?: string | null;
          amount?: number;
          is_paid?: boolean;
          paid_at?: string | null;
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
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: NotificationType;
          title?: string;
          body?: string | null;
          link?: string | null;
          is_read?: boolean;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_merchant_owner: {
        Args: { merchant_uuid: string };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      product_status: ProductStatus;
      campaign_status: CampaignStatus;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
      delivery_status: DeliveryStatus;
      notification_type: NotificationType;
      seller_status: SellerStatus;
    };
  };
}
