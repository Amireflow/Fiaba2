import { useState } from 'react';
import { Chart02Icon, StarIcon, Tick01Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { read, write } from '@/lib/storage';
import {
  SellerBadge,
  SellerButton as Button,
  SellerCard as Card,
  SellerField,
  SellerPage as Page,
  SellerProgressBar,
  SellerSectionTitle,
  SellerToggle,
  sellerInputClass,
  sellerTextareaClass,
} from '../components/seller-ui';
import { seedSellerProfile } from '@/config/seller-seeds';
import type { SellerProfile, SellerNiche } from '@/types/entities';

const allNiches: SellerNiche[] = ['Beauté', 'Mode', 'Maison', 'Épicerie', 'Tech', 'Sport'];

export function SellerProfile() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<SellerProfile>(() => read('seller-profile', seedSellerProfile));
  const [saved, setSaved] = useState(false);

  function save() {
    write('seller-profile', profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
    toast({ title: 'Profil mis à jour', description: 'Vos informations sont enregistrées.' });
  }

  function update<K extends keyof SellerProfile>(key: K, value: SellerProfile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function toggleNiche(niche: SellerNiche) {
    const has = profile.niches.includes(niche);
    update('niches', has ? profile.niches.filter((n) => n !== niche) : [...profile.niches, niche]);
  }

  function updateSocial(key: keyof SellerProfile['socialLinks'], value: string) {
    setProfile((prev) => ({ ...prev, socialLinks: { ...prev.socialLinks, [key]: value } }));
  }

  const getInitials = (name: string) => name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Page
      eyebrow="Votre identité"
      title="Mon profil"
      description="Présentez qui vous êtes. Les commerçants utilisent ces informations pour vous recommander des campagnes."
    >
      <div className="mt-6 space-y-5">
        {/* Identity card */}
        <Card>
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#dfdbff] text-lg font-bold text-[#5140d4]">{getInitials(profile.name)}</span>
            <div>
              <p className="font-[Space_Grotesk] text-lg font-bold text-[#292541]">{profile.name}</p>
              <p className="mt-0.5 text-xs text-[#77738a]">{profile.city}, Sénégal · {profile.followers}</p>
              <div className="mt-2 flex items-center gap-2">
                <SellerBadge tone="mint"><Icon glyph={StarIcon} size={12} /> Réputation {profile.reputation}%</SellerBadge>
              </div>
            </div>
          </div>
        </Card>

        {/* Reputation */}
        <Card>
          <SellerSectionTitle title="Réputation" subtitle="Basée sur vos ventes, votre taux de livraison et la satisfaction client." />
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#292541]">Score global</span>
              <span className="font-[Space_Grotesk] font-bold text-[#5b49e8]">{profile.reputation}/100</span>
            </div>
            <div className="mt-2"><SellerProgressBar value={profile.reputation} tone="violet" /></div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#f8f7fc] p-3 text-center">
              <span className="text-[#278e69]"><Icon glyph={Chart02Icon} size={18} /></span>
              <p className="mt-2 font-[Space_Grotesk] text-lg font-bold text-[#292541]">42</p>
              <p className="text-[10px] text-[#9290a2]">Ventes</p>
            </div>
            <div className="rounded-2xl bg-[#f8f7fc] p-3 text-center">
              <span className="text-[#5b49e8]"><Icon glyph={UserGroupIcon} size={18} /></span>
              <p className="mt-2 font-[Space_Grotesk] text-lg font-bold text-[#292541]">94%</p>
              <p className="text-[10px] text-[#9290a2]">Livraison</p>
            </div>
            <div className="rounded-2xl bg-[#f8f7fc] p-3 text-center">
              <span className="text-[#ac741e]"><Icon glyph={StarIcon} size={18} /></span>
              <p className="mt-2 font-[Space_Grotesk] text-lg font-bold text-[#292541]">4,8</p>
              <p className="text-[10px] text-[#9290a2]">Note client</p>
            </div>
          </div>
        </Card>

        {/* Niches */}
        <Card>
          <SellerSectionTitle title="Vos niches" subtitle="Définissent les produits qui vous sont recommandés." />
          <div className="mt-4 flex flex-wrap gap-2">
            {allNiches.map((n) => {
              const active = profile.niches.includes(n);
              return (
                <button
                  key={n}
                  onClick={() => toggleNiche(n)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition ${active ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#67627b] hover:bg-[#e4e1ff]'}`}
                  data-testid={`niche-${n}`}
                >
                  {n} {active && <Icon glyph={Tick01Icon} size={12} />}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Personal info */}
        <Card>
          <SellerSectionTitle title="Informations personnelles" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <SellerField label="Nom complet">
              <input value={profile.name} onChange={(e) => update('name', e.target.value)} className={sellerInputClass} data-testid="input-profile-name" />
            </SellerField>
            <SellerField label="Téléphone">
              <input value={profile.phone} onChange={(e) => update('phone', e.target.value)} className={sellerInputClass} data-testid="input-profile-phone" />
            </SellerField>
            <SellerField label="Ville">
              <input value={profile.city} onChange={(e) => update('city', e.target.value)} className={sellerInputClass} data-testid="input-profile-city" />
            </SellerField>
          </div>
          <div className="mt-4">
            <SellerField label="Bio">
              <input value={profile.bio} onChange={(e) => update('bio', e.target.value)} className={sellerInputClass} data-testid="input-profile-bio" />
            </SellerField>
          </div>
        </Card>

        {/* Social links */}
        <Card>
          <SellerSectionTitle title="Réseaux sociaux" subtitle="Où vos clients peuvent vous suivre." />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <SellerField label="WhatsApp">
              <input value={profile.socialLinks.whatsapp ?? ''} onChange={(e) => updateSocial('whatsapp', e.target.value)} placeholder="+221 77…" className={sellerInputClass} data-testid="input-profile-whatsapp" />
            </SellerField>
            <SellerField label="Instagram">
              <input value={profile.socialLinks.instagram ?? ''} onChange={(e) => updateSocial('instagram', e.target.value)} placeholder="@votre.compte" className={sellerInputClass} data-testid="input-profile-instagram" />
            </SellerField>
            <SellerField label="TikTok">
              <input value={profile.socialLinks.tiktok ?? ''} onChange={(e) => updateSocial('tiktok', e.target.value)} placeholder="@votre.compte" className={sellerInputClass} data-testid="input-profile-tiktok" />
            </SellerField>
            <SellerField label="Facebook">
              <input value={profile.socialLinks.facebook ?? ''} onChange={(e) => updateSocial('facebook', e.target.value)} placeholder="facebook.com/votre.page" className={sellerInputClass} data-testid="input-profile-facebook" />
            </SellerField>
          </div>
        </Card>

        {/* Save */}
        <div className="flex justify-end">
          <Button onClick={save} testId="button-save-profile">{saved ? <>Enregistré <Icon glyph={Tick01Icon} size={14} /></> : 'Enregistrer le profil'}</Button>
        </div>
      </div>
    </Page>
  );
}
