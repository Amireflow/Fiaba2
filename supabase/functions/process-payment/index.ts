// Edge Function : process-payment
// Demande un versement pour un marchand
// POST /functions/v1/process-payment
// Body: { merchant_id, amount, method }

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
    // Authentification obligatoire : l'appelant doit être le propriétaire du marchand
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentification requise" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { merchant_id, amount, method } = await req.json();

    if (!merchant_id || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "merchant_id et amount (> 0) sont requis" }),
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

    // Contrôle d'accès : propriétaire du marchand ou admin uniquement
    const { data: merchantOwner } = await supabase
      .from("merchants")
      .select("owner_id")
      .eq("id", merchant_id)
      .single();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (merchantOwner?.owner_id !== user.id && profile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Accès refusé : vous ne gérez pas ce marchand" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier le solde disponible du marchand
    // (somme des commandes livrées - somme des versements déjà versés)
    const { data: orders } = await supabase
      .from("orders")
      .select("total_amount, commission_amount")
      .eq("merchant_id", merchant_id)
      .eq("status", "livree");

    const totalRevenue = orders?.reduce((sum, o) => sum + o.total_amount, 0) ?? 0;
    const totalCommission = orders?.reduce((sum, o) => sum + o.commission_amount, 0) ?? 0;

    const { data: payments } = await supabase
      .from("payments")
      .select("amount")
      .eq("merchant_id", merchant_id)
      .eq("status", "verse");

    const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
    const available = totalRevenue - totalCommission - totalPaid;

    if (amount > available) {
      return new Response(
        JSON.stringify({ error: `Solde insuffisant. Disponible: ${available} F` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Créer la demande de versement
    const reference = `${method === "wave" ? "WV" : method === "orange_money" ? "OM" : "CA"}-${Date.now()}`;
    const { data: payment, error } = await supabase
      .from("payments")
      .insert({
        merchant_id,
        amount,
        method: method ?? "wave",
        status: "en_attente",
        reference,
      })
      .select()
      .single();

    if (error) throw error;

    // Notifier le marchand
    const { data: merchant } = await supabase
      .from("merchants")
      .select("owner_id")
      .eq("id", merchant_id)
      .single();

    if (merchant?.owner_id) {
      await supabase.from("notifications").insert({
        user_id: merchant.owner_id,
        type: "paiement",
        title: "Demande de versement enregistrée",
        body: `${amount} F — ${reference}`,
        link: "/merchant/payments",
      });
    }

    return new Response(
      JSON.stringify({ payment_id: payment.id, reference, status: "en_attente" }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
