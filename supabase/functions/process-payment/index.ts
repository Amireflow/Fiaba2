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
