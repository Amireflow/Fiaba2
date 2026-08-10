// Edge Function : sync-commission
// Synchronise les commissions vendeurs quand une commande passe à "livrée"
// POST /functions/v1/sync-commission
// Body: { order_id }

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
    // Authentification obligatoire : réservée à l'admin ou au marchand de la commande
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentification requise" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { order_id } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: "order_id est requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Vérifier le JWT de l'appelant
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Session invalide ou expirée" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Récupérer la commande
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, merchant_id, seller_id, commission_amount, status, campaign_id")
      .eq("id", order_id)
      .single();

    if (orderError) throw orderError;

    // Contrôle d'accès : admin ou marchand propriétaire de la commande
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const { data: merchant } = await supabase
      .from("merchants")
      .select("owner_id")
      .eq("id", order.merchant_id)
      .single();

    if (profile?.role !== "admin" && merchant?.owner_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Accès refusé" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (order.status !== "livree") {
      return new Response(
        JSON.stringify({ error: "La commande doit être livrée pour synchroniser la commission" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!order.seller_id || order.commission_amount === 0) {
      return new Response(
        JSON.stringify({ message: "Aucune commission à synchroniser" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier si la commission existe déjà
    const { data: existing } = await supabase
      .from("commissions")
      .select("id")
      .eq("order_id", order_id)
      .eq("seller_id", order.seller_id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ message: "Commission déjà synchronisée", commission_id: existing.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Créer la commission
    const { data: commission, error: commError } = await supabase
      .from("commissions")
      .insert({
        seller_id: order.seller_id,
        order_id: order.id,
        campaign_id: order.campaign_id,
        amount: order.commission_amount,
        is_paid: false,
      })
      .select()
      .single();

    if (commError) throw commError;

    // Notifier le vendeur
    const { data: seller } = await supabase
      .from("sellers")
      .select("profile_id")
      .eq("id", order.seller_id)
      .single();

    if (seller?.profile_id) {
      await supabase.from("notifications").insert({
        user_id: seller.profile_id,
        type: "paiement",
        title: "Commission disponible",
        body: `${order.commission_amount} F suite à la commande ${order.id.slice(0, 8)}`,
        link: "/payments",
      });
    }

    return new Response(
      JSON.stringify({ commission_id: commission.id, amount: order.commission_amount }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
