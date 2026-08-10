// Edge Function : create-order
// Crée une commande + ses lignes + calcule la commission vendeur
// POST /functions/v1/create-order
// Body: { merchant_id, seller_id?, campaign_id?, customer_name, customer_phone?, customer_address?, items: [{product_id, quantity}] }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      merchant_id,
      seller_id,
      campaign_id,
      customer_name,
      customer_phone,
      customer_address,
      items,
    } = await req.json();

    if (!merchant_id || !customer_name || !items?.length) {
      return new Response(
        JSON.stringify({ error: "merchant_id, customer_name et items sont requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Valider la campagne : doit exister, être active et appartenir au marchand déclaré
    let campaign: { commission: number; commission_type: string | null; model: string } | null = null;
    if (campaign_id) {
      const { data: camp } = await supabase
        .from("campaigns")
        .select("commission, commission_type, model, merchant_id, status")
        .eq("id", campaign_id)
        .single();

      if (!camp || camp.status !== "active" || camp.merchant_id !== merchant_id) {
        return new Response(
          JSON.stringify({ error: "Campagne invalide, inactive ou ne appartenant pas à ce marchand" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      campaign = camp;
    }

    // Valider le vendeur : doit exister et être actif (anti auto-attribution frauduleuse)
    if (seller_id) {
      const { data: seller } = await supabase
        .from("sellers")
        .select("id, status")
        .eq("id", seller_id)
        .single();
      if (!seller || seller.status !== "actif") {
        return new Response(
          JSON.stringify({ error: "Vendeur invalide ou inactif" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Récupérer les prix des produits
    const productIds = items.map((i: { product_id: string }) => i.product_id);
    const { data: products, error: prodError } = await supabase
      .from("products")
      .select("id, price, stock, name")
      .in("id", productIds);

    if (prodError) throw prodError;

    // Calculer le total
    let totalAmount = 0;
    const orderItems = items.map((item: { product_id: string; quantity: number }) => {
      const product = products.find((p) => p.id === item.product_id);
      if (!product) throw new Error(`Produit ${item.product_id} introuvable`);
      if (product.stock < item.quantity) {
        throw new Error(`Stock insuffisant pour ${product.name}`);
      }
      const lineTotal = product.price * item.quantity;
      totalAmount += lineTotal;
      return {
        product_id: item.product_id,
        product_name: product.name,
        unit_price: product.price,
        quantity: item.quantity,
      };
    });

    // Calculer la commission si une campagne est liée (fixe ou pourcentage)
    let commissionAmount = 0;
    if (campaign && seller_id) {
      if (campaign.commission_type === "fixed") {
        const totalQty = items.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0);
        commissionAmount = campaign.commission * totalQty;
      } else {
        commissionAmount = Math.round(totalAmount * (campaign.commission / 100));
      }
    }

    // Créer la commande
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        merchant_id,
        seller_id: seller_id ?? null,
        campaign_id: campaign_id ?? null,
        customer_name,
        customer_phone: customer_phone ?? null,
        customer_address: customer_address ?? null,
        total_amount: totalAmount,
        commission_amount: commissionAmount,
        status: "a_preparer",
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Insérer les lignes de commande
    const itemsWithOrderId = orderItems.map((i) => ({ ...i, order_id: order.id }));
    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(itemsWithOrderId);
    if (itemsError) throw itemsError;

    // Décrémenter le stock
    for (const item of items) {
      const product = products.find((p) => p.id === item.product_id);
      await supabase
        .from("products")
        .update({ stock: product.stock - item.quantity })
        .eq("id", item.product_id);
    }

    // La commission vendeur est créée par le trigger DB auto_create_commission
    // (idempotent, SECURITY DEFINER) — pas d'insertion manuelle ici.

    // Notifier le marchand
    const { data: merchant } = await supabase
      .from("merchants")
      .select("owner_id")
      .eq("id", merchant_id)
      .single();

    if (merchant?.owner_id) {
      await supabase.from("notifications").insert({
        user_id: merchant.owner_id,
        type: "commande",
        title: `Nouvelle commande ${order.id.slice(0, 8)}`,
        body: `${customer_name} — ${totalAmount} F`,
        link: "/merchant/orders",
      });
    }

    return new Response(
      JSON.stringify({ order_id: order.id, total_amount: totalAmount, commission: commissionAmount }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
