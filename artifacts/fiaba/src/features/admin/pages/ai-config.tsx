import { useState, useEffect, useCallback } from 'react';
import {
  Alert01Icon,
  CheckmarkCircle02Icon,
  Key01Icon,
  PlayCircle02Icon,
  RefreshIcon,
  SparklesIcon,
  ZapIcon,
} from '@hugeicons/core-free-icons';
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

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

type GeminiModel = {
  name: string;
  displayName: string;
  description: string;
  supportsGenerate: boolean;
};

type TestResult = {
  status: TestStatus;
  message: string;
  detail?: string;
};

// ── Helpers ──

function getErrorMessage(status: number, body: any): { message: string; detail: string } {
  switch (status) {
    case 400:
      return {
        message: 'Clé API invalide ou format incorrect',
        detail: body?.error?.message ?? 'La clé fournie n\'est pas reconnue par Google. Vérifiez qu\'elle commence par "AIza" et qu\'elle provient de Google AI Studio.',
      };
    case 403:
      return {
        message: 'Accès refusé — API non activée',
        detail: body?.error?.message ?? 'L\'API Generative Language n\'est pas activée pour ce projet Google Cloud. Activez-la dans la console Google Cloud.',
      };
    case 429:
      return {
        message: 'Quota dépassé (rate limit)',
        detail: body?.error?.message ?? 'Trop de requêtes ont été envoyées. Attendez quelques minutes avant de réessayer, ou vérifiez vos quotas dans Google AI Studio.',
      };
    case 500:
    case 503:
      return {
        message: 'Erreur serveur Google',
        detail: body?.error?.message ?? 'Le service Gemini est temporairement indisponible. Réessayez dans quelques instants.',
      };
    default:
      return {
        message: `Erreur ${status}`,
        detail: body?.error?.message ?? 'Une erreur inattendue s\'est produite. Consultez la console pour plus de détails.',
      };
  }
}

async function fetchGeminiModels(apiKey: string): Promise<{ models: GeminiModel[] | null; error: { status: number; body: any } | null }> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: 'GET' }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { models: null, error: { status: res.status, body } };
    }
    const data = await res.json();
    const allModels: GeminiModel[] = ((data?.models ?? []) as any[])
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m) => ({
        name: m.name?.replace('models/', '') ?? '',
        displayName: m.displayName ?? m.name ?? '',
        description: m.description ?? '',
        supportsGenerate: true,
      }))
      .filter((m) => m.name !== '');
    return { models: allModels, error: null };
  } catch (err: any) {
    return { models: null, error: { status: 0, body: { error: { message: err?.message ?? 'Erreur réseau' } } } };
  }
}

async function testGeminiGeneration(apiKey: string, model: string): Promise<{ ok: boolean; error: { status: number; body: any } | null }> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Réponds uniquement "OK".' }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 10 },
        }),
      }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { ok: false, error: { status: res.status, body } };
    }
    return { ok: true, error: null };
  } catch (err: any) {
    return { ok: false, error: { status: 0, body: { error: { message: err?.message ?? 'Erreur réseau' } } } };
  }
}

// ── Component ──

export function AdminAiConfig() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AiSettings>({
    gemini_api_key: '', model: 'gemini-1.5-flash', max_generations: 3, is_enabled: false,
  });
  const [showKey, setShowKey] = useState(false);

  // Test & models
  const [testResult, setTestResult] = useState<TestResult>({ status: 'idle', message: '' });
  const [availableModels, setAvailableModels] = useState<GeminiModel[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [hasFetchedModels, setHasFetchedModels] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('ai_settings').select('gemini_api_key, model, max_generations, is_enabled').eq('id', 1).single();
      if (!error && data) setSettings(data as AiSettings);
      setLoading(false);
    }
    load();
  }, []);

  // ── Test API key: fetch models + test generation ──
  const testApiKey = useCallback(async (apiKey: string, model: string) => {
    if (!apiKey.trim()) {
      haptic('error');
      setTestResult({ status: 'error', message: 'Aucune clé API saisie', detail: 'Saisissez d\'abord votre clé API Google Gemini.' });
      return;
    }
    haptic('light');
    setTestResult({ status: 'testing', message: 'Test en cours…' });
    setFetchingModels(true);

    // 1. Fetch available models
    const { models, error: modelsError } = await fetchGeminiModels(apiKey.trim());

    if (modelsError) {
      setFetchingModels(false);
      haptic('error');
      const { message, detail } = getErrorMessage(modelsError.status, modelsError.body);
      setTestResult({ status: 'error', message, detail });
      return;
    }

    if (!models || models.length === 0) {
      setFetchingModels(false);
      haptic('error');
      setTestResult({ status: 'error', message: 'Aucun modèle disponible', detail: 'La clé est valide mais aucun modèle compatible n\'a été trouvé. Vérifiez que l\'API Generative Language est activée.' });
      return;
    }

    setAvailableModels(models);
    setHasFetchedModels(true);
    setFetchingModels(false);

    // 2. Test generation on selected model (or first available)
    const testModel = model || models[0].name;
    const { ok, error: genError } = await testGeminiGeneration(apiKey.trim(), testModel);

    if (ok) {
      haptic('success');
      setTestResult({
        status: 'success',
        message: `Clé valide — ${models.length} modèle(s) disponible(s)`,
        detail: `Génération test réussie avec "${testModel}". La clé est opérationnelle et les quotas sont actifs.`,
      });
    } else {
      haptic('error');
      const { message, detail } = getErrorMessage(genError!.status, genError!.body);
      setTestResult({
        status: 'error',
        message: `Clé valide mais génération échouée — ${message}`,
        detail: `La liste des modèles a été récupérée (${models.length} modèles), mais le test de génération a échoué. ${detail}`,
      });
    }
  }, []);

  // ── Fetch models only (without test) ──
  const fetchModels = useCallback(async (apiKey: string) => {
    if (!apiKey.trim()) {
      haptic('error');
      toast({ title: 'Clé manquante', description: 'Saisissez d\'abord une clé API.' });
      return;
    }
    haptic('light');
    setFetchingModels(true);
    const { models, error } = await fetchGeminiModels(apiKey.trim());
    setFetchingModels(false);

    if (error) {
      haptic('error');
      const { message, detail } = getErrorMessage(error.status, error.body);
      setTestResult({ status: 'error', message, detail });
      toast({ title: message, description: detail });
    } else if (models && models.length > 0) {
      setAvailableModels(models);
      setHasFetchedModels(true);
      haptic('success');
      toast({ title: 'Modèles récupérés', description: `${models.length} modèle(s) disponible(s).` });
      // Auto-select current model if still available, else first
      if (!models.find((m) => m.name === settings.model)) {
        setSettings((prev) => ({ ...prev, model: models[0].name }));
      }
    } else {
      haptic('error');
      toast({ title: 'Aucun modèle', description: 'Aucun modèle compatible trouvé.' });
    }
  }, [settings.model, toast]);

  const save = useCallback(async () => {
    haptic('medium');
    setSaving(true);
    const { error } = await (supabase.from('ai_settings') as any)
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
      description="Configurez la clé API Gemini, testez la connexion et sélectionnez le modèle de génération.">
      <div className="mt-6 space-y-5">
        {/* ── Statut ── */}
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

        {/* ── Clé API + Test ── */}
        <Card>
          <AdminField label="Clé API Google Gemini" hint="Trouvable sur Google AI Studio (aistudio.google.com/apikey)">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9290a2]">
                <Icon glyph={Key01Icon} size={16} />
              </span>
              <input
                type={showKey ? 'text' : 'password'}
                value={settings.gemini_api_key}
                onChange={(e) => {
                  setSettings({ ...settings, gemini_api_key: e.target.value });
                  setTestResult({ status: 'idle', message: '' });
                  setHasFetchedModels(false);
                  setAvailableModels([]);
                }}
                placeholder="AIza..."
                className={`${adminInputClass} pl-11 pr-20`}
                data-testid="input-gemini-key"
              />
              <button type="button" onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#9290a2] hover:text-[#5b49e8]">
                {showKey ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </AdminField>

          {/* Test button */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              variant="soft"
              onClick={() => testApiKey(settings.gemini_api_key, settings.model)}
              disabled={testResult.status === 'testing' || fetchingModels || !settings.gemini_api_key.trim()}
              testId="button-test-api-key"
            >
              {testResult.status === 'testing' || fetchingModels ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" /> Test en cours…</>
              ) : (
                <><Icon glyph={PlayCircle02Icon} size={16} /> Tester la clé</>
              )}
            </Button>

            {hasFetchedModels && availableModels.length > 0 && (
              <Button
                variant="ghost"
                onClick={() => fetchModels(settings.gemini_api_key)}
                disabled={fetchingModels}
                testId="button-refresh-models"
              >
                <Icon glyph={RefreshIcon} size={15} /> Rafraîchir les modèles
              </Button>
            )}
          </div>

          {/* Test result */}
          {testResult.status !== 'idle' && (
            <div className={`mt-4 rounded-2xl p-4 ${
              testResult.status === 'success' ? 'bg-[#e7faf2]' :
              testResult.status === 'error' ? 'bg-[#fff0f1]' :
              'bg-[#efedff]'
            }`}>
              <div className="flex items-start gap-3">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                  testResult.status === 'success' ? 'bg-white text-[#278e69]' :
                  testResult.status === 'error' ? 'bg-white text-[#c45667]' :
                  'bg-white text-[#5b49e8]'
                }`}>
                  {testResult.status === 'testing' ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
                  ) : testResult.status === 'success' ? (
                    <Icon glyph={CheckmarkCircle02Icon} size={17} />
                  ) : (
                    <Icon glyph={Alert01Icon} size={17} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-bold ${
                    testResult.status === 'success' ? 'text-[#278e69]' :
                    testResult.status === 'error' ? 'text-[#c45667]' :
                    'text-[#5b49e8]'
                  }`}>
                    {testResult.message}
                  </p>
                  {testResult.detail && (
                    <p className="mt-1 text-xs leading-5 text-[#686380]">{testResult.detail}</p>
                  )}
                  {testResult.status === 'success' && availableModels.length > 0 && (
                    <p className="mt-2 text-[11px] text-[#278e69]">
                      ✓ Génération testée avec succès · {availableModels.length} modèle(s) disponible(s) ci-dessous
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* ── Modèle et limites ── */}
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField
              label="Modèle Gemini"
              hint={hasFetchedModels ? `${availableModels.length} modèle(s) disponible(s)` : 'Testez la clé pour récupérer la liste des modèles'}
            >
              {hasFetchedModels && availableModels.length > 0 ? (
                <select
                  value={settings.model}
                  onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                  className={adminSelectClass}
                  data-testid="select-ai-model"
                >
                  {availableModels.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.displayName} ({m.name})
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={settings.model}
                  onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                  className={adminSelectClass}
                  data-testid="select-ai-model"
                  disabled
                >
                  <option value={settings.model}>{settings.model} (testez la clé pour la liste complète)</option>
                </select>
              )}
            </AdminField>
            <AdminField label="Générations max par produit" hint="Limite de régénérations par produit">
              <input type="number" min={1} max={10} value={settings.max_generations}
                onChange={(e) => setSettings({ ...settings, max_generations: parseInt(e.target.value) || 3 })}
                className={adminInputClass} data-testid="input-max-generations" />
            </AdminField>
          </div>

          {/* Model info */}
          {hasFetchedModels && availableModels.length > 0 && (() => {
            const selectedModel = availableModels.find((m) => m.name === settings.model);
            if (!selectedModel) return null;
            return (
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#f4f3f8] p-3.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#5b49e8] text-white">
                  <Icon glyph={ZapIcon} size={14} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#292541]">{selectedModel.displayName}</p>
                  {selectedModel.description && (
                    <p className="mt-0.5 text-[11px] leading-4 text-[#77738a]">{selectedModel.description}</p>
                  )}
                </div>
              </div>
            );
          })()}
        </Card>

        {/* ── Save ── */}
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
