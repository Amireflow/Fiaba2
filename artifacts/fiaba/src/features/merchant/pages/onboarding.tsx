import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  SmartPhone01Icon,
  Store01Icon,
  UserGroupIcon,
  MapPinIcon,
  SparklesIcon,
  ArrowLeft01Icon,
  Tag01Icon
} from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { haptic } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

const CITIES = [
  'Dakar', 'Pikine', 'Guédiawaye', 'Rufisque', 'Thiès',
  'Mbour', 'Saint-Louis', 'Kaolack', 'Ziguinchor', 'Autre',
];

const NICHES = [
  'Beauté & Cosmétiques', 'Mode & Accessoires', 'Maison & Déco',
  'Tech & Électronique', 'Alimentation & Épicerie', 'Sport & Fitness',
  'Enfants & Bébé', 'Savoir & Formations',
];

const CHANNELS = [
  { id: 'whatsapp', name: 'WhatsApp' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'facebook', name: 'Facebook' },
];

export function Onboarding() {
  const { profile, merchant, seller, refetchProfile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<'marchand' | 'vendeur'>('marchand');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [storeName, setStoreName] = useState('');
  const [city, setCity] = useState('Dakar');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['whatsapp']);
  const [selectedNiches, setSelectedNiches] = useState<string[]>(['Beauté & Cosmétiques']);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      if (profile.role) setRole(profile.role === 'admin' ? 'marchand' : profile.role);
      if (profile.full_name) setFullName(profile.full_name);
      if (profile.phone) setPhone(profile.phone);
      if (profile.city) setCity(profile.city);
    }
  }, [profile]);

  const toggleChannel = (ch: string) => {
    haptic('light');
    setSelectedChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const toggleNiche = (niche: string) => {
    haptic('light');
    setSelectedNiches((prev) =>
      prev.includes(niche) ? prev.filter((n) => n !== niche) : [...prev, niche]
    );
  };

  const handleComplete = async () => {
    if (!profile) return;
    setSubmitting(true);
    haptic('medium');

    try {
      // 1. Update Profile in Supabase
      const { error: profErr } = await (supabase.from('profiles') as any)
        .update({
          full_name: fullName,
          phone: phone || null,
          city: city || 'Dakar',
          role: role,
        })
        .eq('id', profile.id);

      if (profErr) throw profErr;

      // 2. If Merchant, ensure merchant record exists
      if (role === 'marchand') {
        const slugName = (storeName || fullName || 'boutique').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const { error: merchErr } = await (supabase.from('merchants') as any)
          .upsert({
            owner_id: profile.id,
            name: storeName || `Boutique ${fullName || 'Fiaba'}`,
            slug: `${slugName}-${profile.id.slice(0, 6)}`,
            phone: phone || null,
            email: profile.email || null,
            city: city || 'Dakar',
          });
        if (merchErr) console.error('Merchant upsert error:', merchErr);
      }

      // 3. If Seller, ensure seller record exists
      if (role === 'vendeur') {
        const { data: sellRecord } = await (supabase.from('sellers') as any)
          .upsert({
            profile_id: profile.id,
            display_name: fullName || 'Vendeur Fiaba',
            phone: phone || null,
            status: 'actif',
          })
          .select()
          .single();

        const sellerId = sellRecord?.id;
        if (sellerId) {
          await (supabase.from('seller_profiles') as any)
            .upsert({
              profile_id: profile.id,
              city: city || 'Dakar',
              audience_type: selectedChannels.join(', '),
            });
        }
      }

      await refetchProfile();
      haptic('success');
      toast({ title: 'Profil configuré !', description: 'Bienvenue sur Fiaba.' });

      // Direct redirection
      if (role === 'marchand') setLocation('/merchant');
      else setLocation('/seller');
    } catch (err: any) {
      console.error('Onboarding save error:', err);
      toast({ title: 'Erreur', description: err.message || 'Impossible de sauvegarder.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="merchant-grid flex min-h-[100dvh] items-center justify-center bg-[#f8f8fc] px-4 py-10">
      <div className="w-full max-w-[540px]">
        {/* Header Logo */}
        <div className="mb-6 text-center">
          <Link href={`${basePath || ''}/`} className="inline-flex items-center gap-2 text-[#211c42]">
            <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#5b49e8] text-white shadow-sm font-[Space_Grotesk] text-xl font-bold">
              F
            </span>
            <span className="font-[Space_Grotesk] text-2xl font-bold tracking-[-.07em]">Fiaba</span>
          </Link>
        </div>

        {/* Wizard Card */}
        <div className="rounded-[28px] bg-[#fffefd] p-7 shadow-md border border-[#f1effa]">
          {/* Progress bar */}
          <div className="flex items-center justify-between text-xs font-bold text-[#8b88a0]">
            <span>Étape {step} sur 3</span>
            <span className="text-[#5b49e8] font-mono">{step === 1 ? '33%' : step === 2 ? '66%' : '100%'}</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[#eeeaf7]">
            <div
              className="h-full bg-[#5b49e8] transition-all duration-300 ease-out"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>

          {/* Step 1: Role & Identity */}
          {step === 1 && (
            <div className="mt-6 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h1 className="font-[Space_Grotesk] text-2xl font-bold text-[#282441]">Bienvenue sur Fiaba ! 👋</h1>
                <p className="mt-1.5 text-sm text-[#77738a]">Configurons votre profil pour démarrer</p>
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#514b71] uppercase tracking-wider">Votre activité</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { haptic('light'); setRole('marchand'); }}
                    className={`rounded-2xl border p-4 text-left transition ${
                      role === 'marchand'
                        ? 'border-[#5b49e8] bg-[#efedff] text-[#5040cf] ring-2 ring-[#5b49e8]/20'
                        : 'border-[#e7e5ef] bg-white text-[#757185]'
                    }`}
                  >
                    <Icon glyph={Store01Icon} size={22} />
                    <strong className="mt-3 block text-sm font-bold">Commerçant / Marque</strong>
                    <span className="mt-1 block text-xs opacity-75 leading-relaxed">
                      Je vends mes propres produits et je cherche des vendeurs.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { haptic('light'); setRole('vendeur'); }}
                    className={`rounded-2xl border p-4 text-left transition ${
                      role === 'vendeur'
                        ? 'border-[#5b49e8] bg-[#efedff] text-[#5040cf] ring-2 ring-[#5b49e8]/20'
                        : 'border-[#e7e5ef] bg-white text-[#757185]'
                    }`}
                  >
                    <Icon glyph={UserGroupIcon} size={22} />
                    <strong className="mt-3 block text-sm font-bold">Vendeur Social</strong>
                    <span className="mt-1 block text-xs opacity-75 leading-relaxed">
                      Je recommande des produits à mes proches et je gagne des commissions.
                    </span>
                  </button>
                </div>
              </div>

              {/* Inputs */}
              <div className="space-y-4">
                <label className="block text-xs font-bold text-[#514b71]">
                  Nom & Prénom
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Aminata Ndiaye"
                    className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-[#5b49e8]"
                  />
                </label>

                {role === 'marchand' && (
                  <label className="block text-xs font-bold text-[#514b71]">
                    Nom de votre boutique
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Maison Ndar, Dakar Skincare..."
                      className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-[#5b49e8]"
                    />
                  </label>
                )}

                <label className="block text-xs font-bold text-[#514b71]">
                  Numéro de téléphone (pour les paiements & alertes SMS)
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+221 77 123 45 67"
                    className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-[#5b49e8]"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => { haptic('medium'); setStep(2); }}
                disabled={!fullName.trim()}
                className="w-full rounded-full bg-[#5b49e8] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#4e3bd5] disabled:opacity-50 shadow-md flex items-center justify-center gap-2 mt-4"
              >
                Continuer <Icon glyph={ArrowRight01Icon} size={16} />
              </button>
            </div>
          )}

          {/* Step 2: Location & Channels */}
          {step === 2 && (
            <div className="mt-6 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h1 className="font-[Space_Grotesk] text-2xl font-bold text-[#282441]">Localisation & Canaux 📍</h1>
                <p className="mt-1.5 text-sm text-[#77738a]">Où êtes-vous basé et où partagez-vous ?</p>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-[#514b71]">Ville principale</label>
                <div className="grid grid-cols-3 gap-2">
                  {CITIES.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => { haptic('light'); setCity(c); }}
                      className={`rounded-xl border p-2.5 text-xs font-bold transition ${
                        city === c
                          ? 'border-[#5b49e8] bg-[#efedff] text-[#5040cf]'
                          : 'border-[#e7e5ef] bg-white text-[#757185]'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {role === 'vendeur' && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-[#514b71]">Vos réseaux sociaux principaux</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CHANNELS.map((ch) => {
                      const active = selectedChannels.includes(ch.id);
                      return (
                        <button
                          type="button"
                          key={ch.id}
                          onClick={() => toggleChannel(ch.id)}
                          className={`flex items-center justify-between rounded-xl border p-3 text-xs font-bold transition ${
                            active ? 'border-[#5b49e8] bg-[#efedff] text-[#5040cf]' : 'border-[#e7e5ef] bg-white text-[#757185]'
                          }`}
                        >
                          <span>{ch.name}</span>
                          {active && <Icon glyph={CheckmarkCircle02Icon} size={16} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { haptic('light'); setStep(1); }}
                  className="rounded-full border border-[#e7e5ef] px-5 py-3.5 text-sm font-bold text-[#757185] hover:bg-slate-50 flex items-center gap-2"
                >
                  <Icon glyph={ArrowLeft01Icon} size={16} /> Retour
                </button>
                <button
                  type="button"
                  onClick={() => { haptic('medium'); setStep(3); }}
                  className="flex-1 rounded-full bg-[#5b49e8] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#4e3bd5] shadow-md flex items-center justify-center gap-2"
                >
                  Continuer <Icon glyph={ArrowRight01Icon} size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Categories & Finalize */}
          {step === 3 && (
            <div className="mt-6 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h1 className="font-[Space_Grotesk] text-2xl font-bold text-[#282441]">Catégories d'intérêt 🛍️</h1>
                <p className="mt-1.5 text-sm text-[#77738a]">Sélectionnez les domaines qui vous passionnent</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {NICHES.map((niche) => {
                  const active = selectedNiches.includes(niche);
                  return (
                    <button
                      type="button"
                      key={niche}
                      onClick={() => toggleNiche(niche)}
                      className={`flex items-center justify-between rounded-2xl border p-3.5 text-xs font-bold transition text-left ${
                        active
                          ? 'border-[#5b49e8] bg-[#efedff] text-[#5040cf] ring-2 ring-[#5b49e8]/20'
                          : 'border-[#e7e5ef] bg-white text-[#757185]'
                      }`}
                    >
                      <span>{niche}</span>
                      {active && <Icon glyph={CheckmarkCircle02Icon} size={16} />}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { haptic('light'); setStep(2); }}
                  className="rounded-full border border-[#e7e5ef] px-5 py-3.5 text-sm font-bold text-[#757185] hover:bg-slate-50 flex items-center gap-2"
                >
                  <Icon glyph={ArrowLeft01Icon} size={16} /> Retour
                </button>
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={submitting}
                  className="flex-1 rounded-full bg-[#5b49e8] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#4e3bd5] disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
                >
                  {submitting ? 'Validation...' : 'Terminer & Ouvrir mon espace'}
                  <Icon glyph={SparklesIcon} size={17} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
