import { useState, useEffect, useCallback } from 'react';
import { SparklesIcon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import {
  AdminBadge, AdminButton as Button, AdminCard as Card,
  AdminField, AdminPage, AdminToggle,
  adminInputClass, adminSelectClass,
} from '../components/admin-ui';

type AiSettings = {
  gemini_api_key: string;
  model: string;
  max_generations: number;
  is_enabled: boolean;
};

export function AdminAiConfig() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AiSettings>({
    gemini_api_key: '', model: 'gemini-1.5-flash', max_generations: 3, is_enabled: false,
  });
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('ai_settings').select('gemini_api_key, model, max_generations, is_enabled').eq('id', 1).single();
      if (!error && data) setSettings(data as AiSettings);
      setLoading(false);
    }
    load();
  }, []);

  const save = useCallback(async () => {
    haptic('medium');
    setSaving(true);
    const { error } = await supabase
      .from('ai_settings')
      .update({
        gemini_api_key: settings.gemini_api_key,
        model: settings.model,
        max_generations: settings.max_generations,
        is_enabled: settings.is_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);
    if (error) {
      haptic('error');
      toast({ title: 'Erreur', description: error.message });
    } else {
      haptic('success');
      toast({ title: 'Configuration IA enregistrée', description: 'Les paramètres sont actifs immédiatement.' });
    }
    setSaving(false);
  }, [settings, toast]);

  if (loading) {
    return (
      <AdminPage eyebrow="Configuration" title="IA" description="Chargement…">
        <Card className="mt-6"><div className="flex justify-center py-12">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
        </div></Card>
      </AdminPage>
    );
  }

  return (
    <AdminPage eyebrow="Configuration" title="Intelligence Artificielle"
      description="Configurez la clé API Gemini et les paramètres de génération de contenu IA.">
      <div className="mt-6 space-y-5">
        {/* Statut */}
        <Card className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]">
              <Icon glyph={SparklesIcon} size={20} />
            </span>
            <div>
              <p className="text-sm font-bold text-[#292541]">Génération IA</p>
              <p className="text-[11px] text-[#9290a2]">Active ou désactive la génération sur toute la plateforme</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AdminBadge tone={settings.is_enabled ? 'mint' : 'slate'}>
              {settings.is_enabled ? 'Activée' : 'Désactivée'}
            </AdminBadge>
            <AdminToggle checked={settings.is_enabled} onChange={(v) => setSettings({ ...settings, is_enabled: v })} testId="toggle-ai-enabled" />
          </div>
        </Card>

        {/* Clé API */}
        <Card>
          <AdminField label="Clé API Google Gemini" hint="Trouvable sur Google AI Studio (aistudio.google.com)">
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={settings.gemini_api_key}
                onChange={(e) => setSettings({ ...settings, gemini_api_key: e.target.value })}
                placeholder="AIza..."
                className={adminInputClass}
                data-testid="input-gemini-key"
              />
              <button type="button" onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#9290a2] hover:text-[#5b49e8]">
                {showKey ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </AdminField>
        </Card>

        {/* Modèle et limites */}
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Modèle Gemini">
              <select value={settings.model} onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                className={adminSelectClass} data-testid="select-ai-model">
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (rapide)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (qualité)</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              </select>
            </AdminField>
            <AdminField label="Générations max par produit" hint="Limite de régénérations par produit">
              <input type="number" min={1} max={10} value={settings.max_generations}
                onChange={(e) => setSettings({ ...settings, max_generations: parseInt(e.target.value) || 3 })}
                className={adminInputClass} data-testid="input-max-generations" />
            </AdminField>
          </div>
        </Card>

        {/* Save */}
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} testId="button-save-ai-config">
            {saving ? (
              <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Enregistrement…</>
            ) : (
              <><Icon glyph={CheckmarkCircle02Icon} size={16} /> Enregistrer</>
            )}
          </Button>
        </div>
      </div>
    </AdminPage>
  );
}
