import { useState } from 'react';
import { Tick01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { read, write } from '@/lib/storage';
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
import type { MerchantProfile } from '@/types/entities';

type Settings = MerchantProfile & {
  bio: string;
  conditions: string;
  bankProvider: string;
  bankNumber: string;
  notifications: {
    orders: boolean;
    sellers: boolean;
    tips: boolean;
  };
};

const defaultSettings: Settings = {
  name: 'Maison Ndar',
  phone: '+221 77 482 19 06',
  email: 'bonjour@maisonndar.sn',
  bio: 'Maison de beauté et de mode sénégalaise. Karité, indigo et savoir-faire local.',
  conditions: 'Livraison sous 24 à 48h à Dakar. Échange possible sous 7 jours.',
  bankProvider: 'wave',
  bankNumber: '38 42 19 06',
  notifications: { orders: true, sellers: true, tips: false },
};

export function Settings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>(() => read('settings', defaultSettings));
  const [savedSection, setSavedSection] = useState<string | null>(null);

  function save(section: keyof Settings | 'notifications') {
    write('settings', settings);
    setSavedSection(section as string);
    setTimeout(() => setSavedSection(null), 1800);
    toast({ title: 'Modifications enregistrées', description: 'Vos informations sont à jour.' });
  }

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function updateNotification(key: keyof Settings['notifications'], value: boolean) {
    setSettings((prev) => ({ ...prev, notifications: { ...prev.notifications, [key]: value } }));
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
              <input value={settings.name} onChange={(e) => update('name', e.target.value)} className={inputClass} data-testid="input-name" />
            </label>
            <label className="block text-xs font-bold text-[#514b71]">
              Email
              <input type="email" value={settings.email} onChange={(e) => update('email', e.target.value)} className={inputClass} data-testid="input-email" />
            </label>
            <label className="block text-xs font-bold text-[#514b71]">
              Téléphone
              <input value={settings.phone} onChange={(e) => update('phone', e.target.value)} className={inputClass} data-testid="input-phone" />
            </label>
            <label className="block text-xs font-bold text-[#514b71]">
              Bio
              <input value={settings.bio} onChange={(e) => update('bio', e.target.value)} placeholder="Décrivez votre maison en une phrase" className={inputClass} data-testid="input-bio" />
            </label>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <Button onClick={() => save('name')} testId="button-save-profile">{savedSection === 'name' ? <>Enregistré <Icon glyph={Tick01Icon} size={14} /></> : 'Enregistrer le profil'}</Button>
          </div>
        </Card>

        {/* Bank */}
        <Card>
          <SectionTitle title="Compte de versement" subtitle="Où recevoir vos gains Fiaba." />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold text-[#514b71]">
              Opérateur
              <select value={settings.bankProvider} onChange={(e) => update('bankProvider', e.target.value)} className={selectClass} data-testid="input-bank-provider">
                <option value="wave">Wave</option>
                <option value="om">Orange Money</option>
                <option value="bank">Compte bancaire</option>
              </select>
            </label>
            <label className="block text-xs font-bold text-[#514b71]">
              Numéro de compte
              <input value={settings.bankNumber} onChange={(e) => update('bankNumber', e.target.value)} placeholder="Ex. 38 42 19 06" className={inputClass} data-testid="input-bank-number" />
            </label>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <Button onClick={() => save('bankProvider')} testId="button-save-bank">{savedSection === 'bankProvider' ? <>Enregistré <Icon glyph={Tick01Icon} size={14} /></> : 'Enregistrer le compte'}</Button>
            <Badge tone="mint">Vérifié</Badge>
          </div>
        </Card>

        {/* Conditions */}
        <Card>
          <SectionTitle title="Conditions de vente" subtitle="Affichées à vos clients avant la commande." />
          <textarea
            value={settings.conditions}
            onChange={(e) => update('conditions', e.target.value)}
            className={`${textareaClass} mt-4 min-h-24`}
            data-testid="textarea-conditions"
          />
          <div className="mt-4">
            <Button onClick={() => save('conditions')} testId="button-save-conditions">{savedSection === 'conditions' ? <>Enregistré <Icon glyph={Tick01Icon} size={14} /></> : 'Enregistrer les conditions'}</Button>
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <SectionTitle title="Notifications" subtitle="Restez au courant sans être interrompue." />
          <div className="mt-4 divide-y divide-[#f1eef7]">
            {([
              ['orders', 'Nouvelles commandes', 'Recevoir une alerte à chaque commande'],
              ['sellers', 'Activité des vendeurs', 'Un résumé chaque semaine'],
              ['tips', 'Conseils Fiaba', 'Astuces pour développer vos ventes'],
            ] as const).map(([key, label, desc]) => (
              <div key={key} className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-bold text-[#292541]">{label}</p>
                  <p className="mt-0.5 text-[11px] text-[#9290a2]">{desc}</p>
                </div>
                <Toggle checked={settings.notifications[key]} onChange={(v) => updateNotification(key, v)} testId={`toggle-${key}`} />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button onClick={() => save('notifications')} testId="button-save-notifications">{savedSection === 'notifications' ? <>Enregistré <Icon glyph={Tick01Icon} size={14} /></> : 'Enregistrer les préférences'}</Button>
          </div>
        </Card>

        {/* Security */}
        <Card>
          <SectionTitle title="Sécurité" subtitle="Protégez votre compte Fiaba." />
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-[#f8f7fc] p-4">
              <div><p className="text-sm font-bold text-[#292541]">Mot de passe</p><p className="mt-0.5 text-[11px] text-[#9290a2]">Modifié il y a 3 mois</p></div>
              <Button variant="soft" onClick={() => toast({ title: 'Email envoyé', description: 'Un lien de réinitialisation a été envoyé.' })} testId="button-change-password">Modifier</Button>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-[#f8f7fc] p-4">
              <div><p className="text-sm font-bold text-[#292541]">Authentification à deux facteurs</p><p className="mt-0.5 text-[11px] text-[#9290a2]">Sécurisez votre connexion par SMS</p></div>
              <Toggle checked={false} onChange={() => toast({ title: '2FA bientôt disponible', description: 'Cette fonctionnalité arrive prochainement.' })} testId="toggle-2fa" />
            </div>
          </div>
        </Card>
      </div>
    </Page>
  );
}
