// Edge Function : generate-product-ai
// Génère du contenu marketing pour une page produit via Google Gemini
// POST /functions/v1/generate-product-ai
// Body: { product_id: string }
// Returns: { headline, benefits: [{icon,title,text}], faq: [{question,answer}], cta_text }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_GENERATIONS = 3;

const PROMPT = `Tu es un expert en copywriting e-commerce pour le marché sénégalais.
Génère du contenu marketing optimisé pour la conversion pour ce produit.

RÈGLES :
- Langue : français
- Ton : commercial, accessible, pas trop formel, chaleureux
- Contexte : marché sénégalais, paiement Wave/Orange Money, livraison locale
- Évite : jargon technique, promesses exagérées, termes anglais non traduits
- Sois concret et spécifique au produit

Génère UNIQUEMENT un JSON valide avec cette structure exacte :
{
  "headline": "Une accroche percutante de 8-12 mots qui donne envie d'acheter",
  "benefits": [
    {"icon": "check", "title": "Titre du bénéfice (3-5 mots)", "text": "Description du bénéfice (10-15 mots)"},
    {"icon": "check", "title": "Titre du bénéfice (3-5 mots)", "text": "Description du bénéfice (10-15 mots)"},
    {"icon": "check", "title": "Titre du bénéfice (3-5 mots)", "text": "Description du bénéfice (10-15 mots)"}
  ],
  "faq": [
    {"question": "Question fréquente du client", "answer": "Réponse claire et rassurante (15-25 mots)"},
    {"question": "Question fréquente du client", "answer": "Réponse claire et rassurante (15-25 mots)"},
    {"question": "Question fréquente du client", "answer": "Réponse claire et rassurante (15-25 mots)"}
  ],
  "cta_text": "Texte du bouton d'action (3-6 mots)"
}

Ne renvoie QUE le JSON, aucun autre texte.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { product_id } = await req.json();

    if (!product_id) {
      return new Response(
        JSON.stringify({ error: "product_id est requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Récupérer le produit
    const { data: product, error: prodError } = await supabase
      .from("products")
      .select("id, name, description, category, price, type, ai_generation_count")
      .eq("id", product_id)
      .single();

    if (prodError || !product) {
      return new Response(
        JSON.stringify({ error: "Produit introuvable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Récupérer la configuration IA depuis la base
    const { data: aiSettings, error: settingsError } = await supabase
      .from("ai_settings")
      .select("gemini_api_key, model, max_generations, is_enabled")
      .eq("id", 1)
      .single();

    if (settingsError || !aiSettings) {
      return new Response(
        JSON.stringify({ error: "Configuration IA non trouvée. Configurez l'IA dans l'admin." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!aiSettings.is_enabled) {
      return new Response(
        JSON.stringify({ error: "La génération IA est désactivée. Activez-la dans l'admin." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!aiSettings.gemini_api_key) {
      return new Response(
        JSON.stringify({ error: "Clé API Gemini manquante. Configurez-la dans l'admin." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const maxGens = aiSettings.max_generations ?? MAX_GENERATIONS;

    // Limite de générations
    if (product.ai_generation_count >= maxGens) {
      return new Response(
        JSON.stringify({ error: `Limite de ${maxGens} générations atteinte pour ce produit` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Construire le contexte produit pour le prompt
    const productContext = `
Produit : ${product.name}
Catégorie : ${product.category}
Prix : ${product.price} FCFA
Type : ${product.type === "digital" ? "Produit digital (téléchargement immédiat)" : "Produit physique (livraison)"}
Description existante : ${product.description || "Aucune description fournie"}
`;

    const fullPrompt = `${PROMPT}

${productContext}`;

    // Appel à Gemini API avec la clé configurée par l'admin
    const apiKey = aiSettings.gemini_api_key;
    const model = aiSettings.model || "gemini-1.5-flash";

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error("Gemini API error:", errText);
      return new Response(
        JSON.stringify({ error: "Erreur de l'API IA. Veuillez réessayer." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();
    const generatedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return new Response(
        JSON.stringify({ error: "Réponse IA vide. Veuillez réessayer." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parser le JSON généré
    let aiContent: {
      headline: string;
      benefits: { icon: string; title: string; text: string }[];
      faq: { question: string; answer: string }[];
      cta_text: string;
    };

    try {
      aiContent = JSON.parse(generatedText);
    } catch {
      // Tenter d'extraire le JSON d'un bloc markdown
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return new Response(
          JSON.stringify({ error: "Format de réponse IA invalide" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      aiContent = JSON.parse(jsonMatch[0]);
    }

    // Sauvegarder en base
    const { error: updateError } = await supabase
      .from("products")
      .update({
        ai_headline: aiContent.headline,
        ai_benefits: aiContent.benefits,
        ai_faq: aiContent.faq,
        ai_cta_text: aiContent.cta_text,
        ai_generated_at: new Date().toISOString(),
        ai_generation_count: product.ai_generation_count + 1,
      })
      .eq("id", product_id);

    if (updateError) {
      console.error("DB update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la sauvegarde" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        ...aiContent,
        generations_remaining: maxGens - (product.ai_generation_count + 1),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
