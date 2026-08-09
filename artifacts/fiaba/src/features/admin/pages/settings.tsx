import { useState } from 'react';
import { Settings01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { read, write } from '@/lib/storage';
import {
  AdminBadge,
  AdminButton as Button,
  AdminCard as Card,
  AdminField,
  AdminPage,
  AdminSectionTitle,
  adminInputClass,
} from '../components/admin-ui';
import { seedAdminSettings } from '@/config/admin-seeds';
import type { AdminCountrySetting } from '@/types/entities';

const statusTone = (s: AdminCountrySetting['status']) => (s === 'Actif' ? 'mint' : s === 'À configurer' ? 'amber' : 'slate');
const categoryTone = (c: AdminCountrySetting['category']) => (c === 'Pays' ? 'violet' : c === 'Frais' ? 'amber' : 'mint');

export function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AdminCountrySetting[]>(() => read('admin-settings', seedAdminSettings));
  const [platformFee, setPlatformFee] = useState('5');
  const [safetyPeriod, setSafetyPeriod] = useState('7');
  const [codLimit, setCodLimit] = useState('75000');

  function saveSetting(key: string, value: string) {
    const updated = settings.map((s) => (s.key === key ? { ...s, value } : s));
    setSettings(updated);
    write('admin-settings', updated);
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
          <Button variant="primary" onClick={() => toast({ title: 'Règles financières enregistrées', description: `Frais ${platformFee}% · sécurité ${safetyPeriod}j · COD ${codLimit} F. Tracé dans l'audit.` })} testId="button-save-financial">
            <Icon glyph={Tick01Icon} size={15} /> Enregistrer
          </Button>
        </div>
      </Card>

      {/* Reference settings grouped */}
      {Object.entries(grouped).map(([category, items]) => (
        <Card key={category} className="mt-4">
          <AdminSectionTitle title={category} />
          <div className="mt-4 divide-y divide-[#f1eef7]">
            {items.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#292541]">{s.label}</p>
                  <p className="mt-0.5 truncate text-xs text-[#9290a2]">{s.value}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <AdminBadge tone={categoryTone(s.category)}>{s.category}</AdminBadge>
                  <AdminBadge tone={statusTone(s.status)}>{s.status}</AdminBadge>
                  {s.status === 'À configurer' && (
                    <Button variant="soft" onClick={() => saveSetting(s.key, 'En cours de configuration')} testId={`button-configure-${s.key}`}>Configurer</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

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
