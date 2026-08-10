import { useState, useEffect } from 'react';
import { Tick01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import {
  Badge,
  MerchantButton as Button,
  MerchantCard as Card,
  Page,
  SectionTitle,
  Toggle,
  inputClass,
  selectClass,
  textareaClass,
} from '../components/merchant-ui';

export function Settings() {
  const { toast } = useToast();
  const { profile: authProfile, merchant: authMerchant, refetchProfile } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [conditions, setConditions] = useState('Livraison sous 24 à 48h à Dakar. Échange possible sous 7 jours.');
  const [bankProvider, setBankProvider] = useState('wave');
  const [bankNumber, setBankNumber] = useState('');
  const [notifications, setNotifications] = useState({ orders: true, sellers: true, tips: false });

  const [saving, setSaving] = useState(false);
  const [savedSection, setSavedSection] = useState<string | null>(null);

  useEffect(() => {
    if (authProfile) {
      setEmail(authProfile.email || '');
      setPhone(authProfile.phone || '');
    }
    if (authMerchant) {
      setName(authMerchant.name || '');
      setBio(authMerchant.description || '');
      if (authMerchant.phone) setPhone(authMerchant.phone);
    }
  }, [authProfile, authMerchant]);

  async function saveSection(section: string) {
    if (!authProfile) return;
    setSaving(true);

    try {
      // 1. Update Profile
      await (supabase.from('profiles') as any)
        .update({
          full_name: name || authProfile.full_name,
          phone: phone || null,
        })
        .eq('id', authProfile.id);

      // 2. Update Merchant
      if (authMerchant) {
        let cleanName = (name || authMerchant.name || '').trim();
        cleanName = cleanName.replace(/^(Boutique\s+)+/i, '').trim();
        if (!cleanName) cleanName = 'Ma Boutique';

        await (supabase.from('merchants') as any)
          .update({
            name: cleanName,
            phone: phone || null,
            description: bio || null,
          })
          .eq('id', authMerchant.id);
      }

      await refetchProfile();
      setSavedSection(section);
      setTimeout(() => setSavedSection(null), 2000);
      toast({ title: 'Modifications enregistrées', description: 'Vos informations sont désormais à jour.' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Sauvegarde impossible.' });
    } finally {
      setSaving(false);
    }
  }

  function updateNotification(key: keyof typeof notifications, value: boolean) {
    setNotifications((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Page
      eyebrow="Votre maison"
      title="Réglages"
      description="Présentez votre activité avec justesse et choisissez les nouvelles qui comptent."
    >
      <div className="mt-6 space-y-5">
        {/* Profile */}
        <Card>
          <SectionTitle title="Profil commerçant" subtitle="Ces informations sont visibles par votre réseau." />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold text-[#514b71]">
              Nom de la boutique
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} data-testid="input-name" />
            </label>
            <label className="block text-xs font-bold text-[#514b71]">
              Email
              <input type="email" value={email} disabled className={`${inputClass} bg-slate-100 cursor-not-allowed`} data-testid="input-email" />
            </label>
            <label className="block text-xs font-bold text-[#514b71]">
              Téléphone
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} data-testid="input-phone" />
            </label>
            <label className="block text-xs font-bold text-[#514b71]">
              Bio / Présentation
              <input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Décrivez votre boutique" className={inputClass} data-testid="input-bio" />
            </label>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <Button onClick={() => saveSection('profile')} disabled={saving} testId="button-save-profile">
              {savedSection === 'profile' ? <>Enregistré <Icon glyph={Tick01Icon} size={14} /></> : 'Enregistrer le profil'}
            </Button>
          </div>
        </Card>

        {/* Bank */}
        <Card>
          <SectionTitle title="Compte de versement" subtitle="Où recevoir vos encaissements Fiaba." />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold text-[#514b71]">
              Opérateur
              <select value={bankProvider} onChange={(e) => setBankProvider(e.target.value)} className={selectClass} data-testid="input-bank-provider">
                <option value="wave">Wave Mobile Money</option>
                <option value="om">Orange Money Sénégal</option>
                <option value="bank">Compte bancaire (UBOA / CBAO...)</option>
              </select>
            </label>
            <label className="block text-xs font-bold text-[#514b71]">
              Numéro de compte / Téléphone
              <input value={bankNumber || phone} onChange={(e) => setBankNumber(e.target.value)} placeholder="Ex. 77 123 45 67" className={inputClass} data-testid="input-bank-number" />
            </label>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <Button onClick={() => saveSection('bank')} disabled={saving} testId="button-save-bank">
              {savedSection === 'bank' ? <>Enregistré <Icon glyph={Tick01Icon} size={14} /></> : 'Enregistrer le compte'}
            </Button>
            <Badge tone="mint">Actif</Badge>
          </div>
        </Card>

        {/* Conditions */}
        <Card>
          <SectionTitle title="Conditions de vente" subtitle="Affichées à vos clients avant la commande." />
          <textarea
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            className={`${textareaClass} mt-4 min-h-24`}
            data-testid="textarea-conditions"
          />
          <div className="mt-4">
            <Button onClick={() => saveSection('conditions')} disabled={saving} testId="button-save-conditions">
              {savedSection === 'conditions' ? <>Enregistré <Icon glyph={Tick01Icon} size={14} /></> : 'Enregistrer les conditions'}
            </Button>
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <SectionTitle title="Notifications" subtitle="Restez au courant sans être interrompue." />
          <div className="mt-4 divide-y divide-[#f1eef7]">
            {([
              ['orders', 'Nouvelles commandes', 'Recevoir une alerte SMS / Email à chaque commande'],
              ['sellers', 'Activité des vendeurs', 'Un résumé chaque semaine de votre réseau'],
              ['tips', 'Conseils Fiaba', 'Astuces pour développer vos ventes'],
            ] as const).map(([key, label, desc]) => (
              <div key={key} className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-bold text-[#292541]">{label}</p>
                  <p className="mt-0.5 text-[11px] text-[#9290a2]">{desc}</p>
                </div>
                <Toggle checked={notifications[key]} onChange={(v) => updateNotification(key, v)} testId={`toggle-${key}`} />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button onClick={() => saveSection('notifications')} disabled={saving} testId="button-save-notifications">
              {savedSection === 'notifications' ? <>Enregistré <Icon glyph={Tick01Icon} size={14} /></> : 'Enregistrer les préférences'}
            </Button>
          </div>
        </Card>
      </div>
    </Page>
  );
}
