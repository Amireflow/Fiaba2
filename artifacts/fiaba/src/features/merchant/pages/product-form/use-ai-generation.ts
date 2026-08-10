import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/utils';
import type { AiPreview } from './types';

export function useAiGeneration(productId: string | undefined) {
  const { toast } = useToast();
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState<AiPreview>(null);
  const [aiGenerationsLeft, setAiGenerationsLeft] = useState<number | null>(null);

  const generate = useCallback(async () => {
    if (!productId || aiGenerating) return;
    setAiGenerating(true);
    haptic('light');
    try {
      const { data, error } = await supabase.functions.invoke('generate-product-ai', {
        body: { product_id: productId },
      });
      if (error) throw error;
      setAiPreview(data);
      setAiGenerationsLeft(data.generations_remaining ?? null);
      haptic('success');
      toast({
        title: 'Contenu IA généré !',
        description: 'Vérifiez et acceptez le contenu pour votre page de vente.',
      });
    } catch (err: any) {
      haptic('error');
      toast({
        title: 'Génération IA échouée',
        description: err?.message || 'Veuillez réessayer dans un instant.',
      });
    }
    setAiGenerating(false);
  }, [productId, aiGenerating, toast]);

  const dismissPreview = useCallback(() => {
    setAiPreview(null);
    haptic('light');
  }, []);

  return { aiGenerating, aiPreview, aiGenerationsLeft, generate, dismissPreview };
}
