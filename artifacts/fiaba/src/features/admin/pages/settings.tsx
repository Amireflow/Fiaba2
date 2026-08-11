import { useState, useEffect } from 'react';
import { Settings01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import {
  AdminBadge,
  AdminButton as Button,
  AdminCard as Card,
  AdminField,
  AdminPage,
  AdminSectionTitle,
  adminInputClass,
} from '../components/admin-ui';

type SettingRow = {
  id: string;
  key: string;
  label: string;
  value: string;
  category: string;
  is_active: boolean;
};

const statusTone = (isActive: boolean): 'mint' | 'amber' => (isActive ? 'mint' : 'amber');
const categoryTone = (c: string): 'violet' | 'amber' | 'mint' => (c === 'Pays' ? 'violet' : c === 'Frais' ? 'amber' : 'mint');

export function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFee, setPlatformFee] = useState('5');
  const [safetyPeriod, setSafetyPeriod] = useState('14');
  const [codLimit, setCodLimit] = useState('75000');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase
        .from('country_settings')
        .select('id, key, label, value, category, is_active')
        .order('category', { ascending: true })
        .order('label', { ascending: true });
      const rows = (data as SettingRow[] | null) ?? [];
      setSettings(rows);

      // Load financial rules from settings if they exist
      const feeSetting = rows.find((s) => s.key === 'platform_fee_rate');
      const safetySetting = rows.find((s) => s.key === 'safety_period_days');
      const codSetting = rows.find((s) => s.key === 'cod_limit');
      if (feeSetting) setPlatformFee(feeSetting.value);
      if (safetySetting) setSafetyPeriod(safetySetting.value);
      if (codSetting) setCodLimit(codSetting.value);

      setLoading(false);
    }
    loadData();
  }, []);

  async function saveFinancialRules() {
    haptic('medium');
    setSaving(true);

    const rules = [
      { key: 'platform_fee_rate', label: 'Frais de plateforme (%)', value: platformFee, category: 'Frais' },
      { key: 'safety_period_days', label: 'Période de sécurité (jours)', value: safetyPeriod, category: 'Frais' },
      { key: 'cod_limit', label: 'Plafond COD (FCFA)', value: codLimit, category: 'Frais' },
    ];

    try {
      for (const rule of rules) {
        const existing = settings.find((s) => s.key === rule.key);
        let op;
        if (existing) {
          op = await (supabase.from('country_settings') as any).update({ value: rule.value } as never).eq('id', existing.id);
        } else {
          op = await (supabase.from('country_settings') as any).insert({
            key: rule.key,
            label: rule.label,
            value: rule.value,
            category: rule.category,
            is_active: true,
          });
        }
        if (op.error) throw op.error;
      }

      // Refresh settings
      const { data: refreshed, error: refreshErr } = await supabase.from('country_settings').select('id, key, label, value, category, is_active').order('category', { ascending: true }).order('label', { ascending: true });
      if (refreshErr) throw refreshErr;
      setSettings((refreshed as SettingRow[] | null) ?? []);

      toast({ title: 'Règles financières enregistrées', description: `Frais ${platformFee}% · sécurité ${safetyPeriod}j · COD ${codLimit} F. Tracé dans l'audit.` });
    } catch (err: any) {
      haptic('error');
      toast({ title: 'Erreur', description: err?.message || 'Impossible d\'enregistrer les règles.' });
    } finally {
      setSaving(false);
    }
  }

  async function saveSetting(id: string, value: string) {
    haptic('light');
    const { error } = await (supabase.from('country_settings') as any).update({ value } as never).eq('id', id);
    if (error) {
      haptic('error');
      toast({ title: 'Erreur', description: error.message });
      return;
    }
    setSettings((prev) => prev.map((s) => (s.id === id ? { ...s, value } : s)));
    toast({ title: 'Paramètre enregistré', description: "La modification est tracée dans le journal d'audit." });
  }

  const grouped = {
    Pays: settings.filter((s) => s.category === 'Pays'),
    Frais: settings.filter((s) => s.category === 'Frais'),
    Intégration: settings.filter((s) => s.category === 'Intégration'),
  };

  return (
    <AdminPage
      eyebrow="Paramètres"
      title="Pays, frais & intégrations"
      description="Configuration plateforme. Les fournisseurs exacts sont sélectionnés après vérification de leurs API, coûts et SLA au Sénégal (§21)."
    >
      {/* Financial rules */}
      <Card className="mt-6">
        <AdminSectionTitle title="Règles financières" subtitle="Validation serveur de tous les montants (§23)" />
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <AdminField label="Frais de plateforme (%)" hint="Par vente validée">
            <input type="number" value={platformFee} onChange={(e) => setPlatformFee(e.target.value)} className={adminInputClass} data-testid="input-platform-fee" />
          </AdminField>
          <AdminField label="Période de sécurité (jours)" hint="Après livraison">
            <input type="number" value={safetyPeriod} onChange={(e) => setSafetyPeriod(e.target.value)} className={adminInputClass} data-testid="input-safety-period" />
          </AdminField>
          <AdminField label="Plafond COD (FCFA)" hint="Par commande">
            <input type="number" value={codLimit} onChange={(e) => setCodLimit(e.target.value)} className={adminInputClass} data-testid="input-cod-limit" />
          </AdminField>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="primary" onClick={saveFinancialRules} disabled={saving} testId="button-save-financial">
            <Icon glyph={Tick01Icon} size={15} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </Card>

      {/* Reference settings grouped */}
      {loading ? (
        <Card className="mt-4">
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          </div>
        </Card>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <Card key={category} className="mt-4">
            <AdminSectionTitle title={category} />
            <div className="mt-4 divide-y divide-[#f1eef7]">
              {items.length === 0 ? (
                <p className="py-4 text-xs text-[#9290a2]">Aucun paramètre dans cette catégorie.</p>
              ) : (
                items.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#292541]">{s.label}</p>
                      <p className="mt-0.5 truncate text-xs text-[#9290a2]">{s.value}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <AdminBadge tone={categoryTone(s.category)}>{s.category}</AdminBadge>
                      <AdminBadge tone={statusTone(s.is_active)}>{s.is_active ? 'Actif' : 'À configurer'}</AdminBadge>
                      {!s.is_active && (
                        <Button variant="soft" onClick={() => saveSetting(s.id, 'Configuré')} testId={`button-configure-${s.key}`}>Configurer</Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        ))
      )}

      <Card className="mt-4">
        <AdminSectionTitle title="Sécurité & audit" subtitle="§22 · Contrôle d'accès par rôle, journal d'audit" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-[#f4f3f8] p-4">
            <div className="flex items-center gap-2 text-[#278e69]"><Icon glyph={Tick01Icon} size={16} /><p className="text-xs font-bold">OTP avec limitation des tentatives</p></div>
            <p className="mt-1 text-[11px] text-[#9290a2]">Actif sur tous les rôles.</p>
          </div>
          <div className="rounded-xl bg-[#f4f3f8] p-4">
            <div className="flex items-center gap-2 text-[#278e69]"><Icon glyph={Tick01Icon} size={16} /><p className="text-xs font-bold">Sessions sécurisées + rotation tokens</p></div>
            <p className="mt-1 text-[11px] text-[#9290a2]">Rotation toutes les 24h.</p>
          </div>
          <div className="rounded-xl bg-[#f4f3f8] p-4">
            <div className="flex items-center gap-2 text-[#278e69]"><Icon glyph={Tick01Icon} size={16} /><p className="text-xs font-bold">Idempotence webhooks paiement/livraison</p></div>
            <p className="mt-1 text-[11px] text-[#9290a2]">Un webhook reçu plusieurs fois ne crée qu'un paiement.</p>
          </div>
          <div className="rounded-xl bg-[#f4f3f8] p-4">
            <div className="flex items-center gap-2 text-[#278e69]"><Icon glyph={Tick01Icon} size={16} /><p className="text-xs font-bold">Journal d'audit des opérations sensibles</p></div>
            <p className="mt-1 text-[11px] text-[#9290a2]">Toute action admin est tracée.</p>
          </div>
        </div>
      </Card>

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-[#9290a2]">
        <Icon glyph={Settings01Icon} size={13} /> Un compte porte un seul rôle, fixé à l'inscription (§7.1). Changement exceptionnel uniquement via l'administrateur.
      </p>
    </AdminPage>
  );
}
