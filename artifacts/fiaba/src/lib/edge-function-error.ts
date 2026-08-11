/**
 * Extrait le message d'erreur réel renvoyé par une Edge Function.
 *
 * `supabase.functions.invoke()` renvoie une `FunctionsHttpError` dont le
 * message est toujours le même texte générique : « Edge Function returned a
 * non-2xx status code ». Le motif précis se trouve dans le corps JSON de la
 * réponse, accessible via `error.context`. Sans cette lecture, l'utilisateur ne
 * voit jamais la cause réelle (IA désactivée, clé API manquante, quota
 * atteint…) et le problème est indiagnosticable.
 */
export async function readEdgeFunctionError(error: unknown): Promise<string> {
  const context = (error as { context?: unknown })?.context;

  // `context` est la Response HTTP lorsque la fonction a répondu en non-2xx.
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      const message = body?.error ?? body?.message;
      if (typeof message === 'string' && message.trim()) return message;
    } catch {
      try {
        const text = await context.clone().text();
        if (text.trim()) return text;
      } catch {
        // Corps illisible : on retombe sur le message générique ci-dessous.
      }
    }
    return `La fonction a répondu avec le statut ${context.status}.`;
  }

  const fallback = (error as { message?: unknown })?.message;
  return typeof fallback === 'string' && fallback.trim()
    ? fallback
    : 'Erreur inattendue.';
}
