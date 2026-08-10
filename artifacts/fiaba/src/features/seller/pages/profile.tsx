import { useState, useEffect } from 'react';
import { Chart02Icon, StarIcon, Tick01Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import {
  SellerBadge,
  SellerButton as Button,
  SellerCard as Card,
  SellerField,
  SellerPage as Page,
  SellerProgressBar,
  SellerSectionTitle,
  sellerInputClass,
} from '../components/seller-ui';
import type { SellerNiche } from '@/types/entities';

const allNiches: SellerNiche[] = ['Beauté', 'Mode', 'Maison', 'Épicerie', 'Tech', 'Sport'];

export function SellerProfile() {
  const { toast } = useToast();
  const { profile: authProfile, seller: authSeller, refetchProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Dakar');
  const [bio, setBio] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [facebook, setFacebook] = useState('');
  const [selectedNiches, setSelectedNiches] = useState<string[]>(['Beauté', 'Mode']);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (authProfile) {
      setFullName(authProfile.full_name || '');
      setPhone(authProfile.phone || '');
      setCity(authProfile.city || 'Dakar');
    }
    if (authSeller) {
      const disp = authSeller.display_name || authProfile?.full_name || '';
      if (disp.startsWith('@')) {
        setUsername(disp);
      } else {
        setUsername(disp ? `@${disp.toLowerCase().replace(/[^a-z0-9_]/g, '_')}` : '');
      }
    }
  }, [authProfile, authSeller]);

  function toggleNiche(niche: SellerNiche) {
    setSelectedNiches((prev) =>
      prev.includes(niche) ? prev.filter((n) => n !== niche) : [...prev, niche]
    );
  }

  async function save() {
    if (!authProfile) return;
    setSaving(true);

    try {
      // 1. Update Profile in Supabase
      const { error: profErr } = await (supabase.from('profiles') as any)
        .update({
          full_name: fullName,
          phone: phone || null,
          city: city || 'Dakar',
        })
        .eq('id', authProfile.id);

      if (profErr) throw profErr;

      // 2. Update Seller in Supabase if exists
      if (authSeller) {
        const formattedUser = username.trim()
          ? (username.trim().startsWith('@') ? username.trim() : `@${username.trim()}`)
          : `@${fullName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;

        await (supabase.from('sellers') as any)
          .update({
            display_name: formattedUser,
            phone: phone || null,
          })
          .eq('id', authSeller.id);
      }

      await refetchProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast({ title: 'Profil mis à jour !', description: 'Vos informations ont été enregistrées avec succès.' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Impossible de sauvegarder.' });
    } finally {
      setSaving(false);
    }
  }

  const getInitials = (name: string) => (name || 'Vendeur').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const trustScore = authProfile?.trust_score ?? 85;

  return (
    <Page
      eyebrow="Votre identité"
      title="Mon profil"
      description="Présentez qui vous êtes. Les commerçants utilisent ces informations pour vous accorder leur confiance."
    >
      <div className="mt-6 space-y-5">
        {/* Identity card */}
        <Card>
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#dfdbff] text-lg font-bold text-[#5140d4]">
              {getInitials(fullName)}
            </span>
            <div>
              <p className="font-[Space_Grotesk] text-lg font-bold text-[#292541]">{fullName || authProfile?.email || 'Vendeur Fiaba'}</p>
              <p className="mt-0.5 text-xs text-[#77738a]">{city}, Sénégal · {authProfile?.email || 'Compte actif'}</p>
              <div className="mt-2 flex items-center gap-2">
                <SellerBadge tone="mint">
                  <Icon glyph={StarIcon} size={12} /> Réputation {trustScore}%
                </SellerBadge>
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
              <span className="font-[Space_Grotesk] font-bold text-[#5b49e8]">{trustScore}/100</span>
            </div>
            <div className="mt-2"><SellerProgressBar value={trustScore} tone="violet" /></div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#f8f7fc] p-3 text-center">
              <span className="text-[#278e69]"><Icon glyph={Chart02Icon} size={18} /></span>
              <p className="mt-2 font-[Space_Grotesk] text-lg font-bold text-[#292541]">Actif</p>
              <p className="text-[10px] text-[#9290a2]">Statut Vendeur</p>
            </div>
            <div className="rounded-2xl bg-[#f8f7fc] p-3 text-center">
              <span className="text-[#5b49e8]"><Icon glyph={UserGroupIcon} size={18} /></span>
              <p className="mt-2 font-[Space_Grotesk] text-lg font-bold text-[#292541]">100%</p>
              <p className="text-[10px] text-[#9290a2]">Transparence</p>
            </div>
            <div className="rounded-2xl bg-[#f8f7fc] p-3 text-center">
              <span className="text-[#ac741e]"><Icon glyph={StarIcon} size={18} /></span>
              <p className="mt-2 font-[Space_Grotesk] text-lg font-bold text-[#292541]">5,0</p>
              <p className="text-[10px] text-[#9290a2]">Note Fiaba</p>
            </div>
          </div>
        </Card>

        {/* Niches */}
        <Card>
          <SellerSectionTitle title="Vos niches d'intérêt" subtitle="Définissent les produits qui vous sont recommandés." />
          <div className="mt-4 flex flex-wrap gap-2">
            {allNiches.map((n) => {
              const active = selectedNiches.includes(n);
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
          <SellerSectionTitle title="Informations personnelles" subtitle="Votre pseudo unique permet de vous identifier sur vos liens de recommandation." />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <SellerField label="Nom complet">
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={sellerInputClass} data-testid="input-profile-name" />
            </SellerField>
            <SellerField label="Nom d'utilisateur unique (@pseudo)">
              <input
                value={username}
                onChange={(e) => {
                  let u = e.target.value;
                  if (u && !u.startsWith('@')) u = `@${u}`;
                  setUsername(u.toLowerCase().replace(/[^@a-z0-9_]/g, ''));
                }}
                placeholder="@mariama_fall"
                className={`${sellerInputClass} font-bold text-[#5b49e8]`}
                data-testid="input-profile-username"
              />
            </SellerField>
            <SellerField label="Téléphone">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={sellerInputClass} data-testid="input-profile-phone" />
            </SellerField>
            <SellerField label="Ville">
              <input value={city} onChange={(e) => setCity(e.target.value)} className={sellerInputClass} data-testid="input-profile-city" />
            </SellerField>
            <SellerField label="Bio / Présentation">
              <input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Créateur passionné de mode & beauté" className={sellerInputClass} data-testid="input-profile-bio" />
            </SellerField>
          </div>
        </Card>

        {/* Social links */}
        <Card>
          <SellerSectionTitle title="Réseaux sociaux" subtitle="Où vos clients peuvent vous suivre." />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <SellerField label="WhatsApp">
              <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+221 77…" className={sellerInputClass} data-testid="input-profile-whatsapp" />
            </SellerField>
            <SellerField label="Instagram">
              <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@votre.compte" className={sellerInputClass} data-testid="input-profile-instagram" />
            </SellerField>
            <SellerField label="TikTok">
              <input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="@votre.compte" className={sellerInputClass} data-testid="input-profile-tiktok" />
            </SellerField>
            <SellerField label="Facebook">
              <input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="facebook.com/votre.page" className={sellerInputClass} data-testid="input-profile-facebook" />
            </SellerField>
          </div>
        </Card>

        {/* Save */}
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} testId="button-save-profile">
            {saved ? <>Enregistré <Icon glyph={Tick01Icon} size={14} /></> : saving ? 'Sauvegarde...' : 'Enregistrer le profil'}
          </Button>
        </div>
      </div>
    </Page>
  );
}
