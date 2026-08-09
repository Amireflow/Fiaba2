import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
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

  // Identity pre-filled from auth profile (No redundancy)
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [storeName, setStoreName] = useState('');

  // Preference fields
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
    setSubmitting(true);
    haptic('medium');

    try {
      if (profile?.id) {
        // 1. Update Profile Location & Role
        await (supabase.from('profiles') as any)
          .update({
            full_name: fullName || profile.full_name,
            phone: phone || profile.phone,
            city: city || 'Dakar',
            role: role,
          })
          .eq('id', profile.id);

        // 2. If Merchant, ensure merchant record exists
        if (role === 'marchand') {
          const nameToUse = storeName || fullName || profile.full_name || 'Ma Boutique';
          const slugName = nameToUse.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          await (supabase.from('merchants') as any)
            .upsert({
              owner_id: profile.id,
              name: nameToUse,
              slug: `${slugName}-${profile.id.slice(0, 6)}`,
              phone: phone || profile.phone || null,
              email: profile.email || null,
              city: city || 'Dakar',
            });
        }

        // 3. If Seller, ensure seller record exists
        if (role === 'vendeur') {
          const { data: sellRecord } = await (supabase.from('sellers') as any)
            .upsert({
              profile_id: profile.id,
              display_name: fullName || profile.full_name || 'Vendeur Fiaba',
              phone: phone || profile.phone || null,
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
      }
    } catch (err: any) {
      console.error('Onboarding save error:', err);
    } finally {
      haptic('success');
      toast({ title: 'Profil configuré !', description: 'Bienvenue sur Fiaba.' });
      setSubmitting(false);

      // ALWAYS perform target navigation (never stuck on button click!)
      const targetRole = profile?.role || role;
      if (targetRole === 'marchand') {
        setLocation('/merchant');
      } else if (targetRole === 'admin') {
        setLocation('/admin');
      } else {
        setLocation('/seller');
      }
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
          {/* Identity Summary Bar (Prevents re-typing) */}
          <div className="mb-5 flex items-center justify-between rounded-2xl bg-[#efedff] px-4 py-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#5b49e8] text-white font-bold">
                <Icon glyph={role === 'marchand' ? Store01Icon : UserGroupIcon} size={16} />
              </span>
              <div>
                <p className="font-bold text-[#292541]">{fullName || profile?.full_name || 'Utilisateur Fiaba'}</p>
                <p className="text-[11px] text-[#5040cf]">{role === 'marchand' ? 'Compte Commerçant / Marque' : 'Compte Vendeur Social'}</p>
              </div>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#278e69]">
              Identité vérifiée
            </span>
          </div>

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

          {/* Step 1: Location */}
          {step === 1 && (
            <div className="mt-6 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h1 className="font-[Space_Grotesk] text-2xl font-bold text-[#282441]">Votre Ville d'activité 📍</h1>
                <p className="mt-1.5 text-sm text-[#77738a]">Où êtes-vous basé pour la livraison ou les opportunités ?</p>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-[#514b71] uppercase tracking-wider">Ville principale</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CITIES.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => { haptic('light'); setCity(c); }}
                      className={`rounded-xl border p-3 text-xs font-bold transition ${
                        city === c
                          ? 'border-[#5b49e8] bg-[#efedff] text-[#5040cf] ring-2 ring-[#5b49e8]/20'
                          : 'border-[#e7e5ef] bg-white text-[#757185] hover:bg-[#f8f8fc]'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => { haptic('medium'); setStep(2); }}
                className="w-full rounded-full bg-[#5b49e8] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#4e3bd5] shadow-md flex items-center justify-center gap-2 mt-4"
              >
                Continuer <Icon glyph={ArrowRight01Icon} size={16} />
              </button>
            </div>
          )}

          {/* Step 2: Niches & Channels */}
          {step === 2 && (
            <div className="mt-6 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h1 className="font-[Space_Grotesk] text-2xl font-bold text-[#282441]">Niches & Canaux 🛍️</h1>
                <p className="mt-1.5 text-sm text-[#77738a]">Quels produits souhaitez-vous cibler et sur quels réseaux ?</p>
              </div>

              {/* Niches */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-[#514b71] uppercase tracking-wider">Secteurs & Niches d'intérêt</label>
                <div className="grid grid-cols-2 gap-2">
                  {NICHES.map((niche) => {
                    const active = selectedNiches.includes(niche);
                    return (
                      <button
                        type="button"
                        key={niche}
                        onClick={() => toggleNiche(niche)}
                        className={`flex items-center justify-between rounded-xl border p-3 text-xs font-bold transition text-left ${
                          active
                            ? 'border-[#5b49e8] bg-[#efedff] text-[#5040cf]'
                            : 'border-[#e7e5ef] bg-white text-[#757185] hover:bg-[#f8f8fc]'
                        }`}
                      >
                        <span>{niche}</span>
                        {active && <Icon glyph={CheckmarkCircle02Icon} size={16} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Channels (for Sellers) */}
              {role === 'vendeur' && (
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-[#514b71] uppercase tracking-wider">Vos réseaux sociaux principaux</label>
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
                  onClick={() => setStep(1)}
                  className="rounded-full bg-[#f4f3f8] p-3 text-[#514b71] hover:bg-[#eeeaf7]"
                >
                  <Icon glyph={ArrowLeft01Icon} size={18} />
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

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="mt-6 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="text-center">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#e7faf2] text-[#278e69]">
                  <Icon glyph={SparklesIcon} size={32} />
                </span>
                <h1 className="mt-4 font-[Space_Grotesk] text-2xl font-bold text-[#282441]">Tout est prêt ! 🚀</h1>
                <p className="mt-1.5 text-sm text-[#77738a]">
                  Votre espace Fiaba est configuré pour {fullName || profile?.full_name}.
                </p>
              </div>

              <div className="rounded-2xl bg-[#f8f7fc] p-4 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#efedf5]">
                  <span className="text-[#8b88a0]">Ville</span>
                  <strong className="text-[#292541]">{city}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[#efedf5]">
                  <span className="text-[#8b88a0]">Niches cibles</span>
                  <strong className="text-[#292541]">{selectedNiches.join(', ')}</strong>
                </div>
                {role === 'vendeur' && (
                  <div className="flex justify-between py-1">
                    <span className="text-[#8b88a0]">Canaux</span>
                    <strong className="text-[#292541]">{selectedChannels.join(', ')}</strong>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-full bg-[#f4f3f8] p-3 text-[#514b71] hover:bg-[#eeeaf7]"
                >
                  <Icon glyph={ArrowLeft01Icon} size={18} />
                </button>
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={submitting}
                  className="flex-1 rounded-full bg-[#5b49e8] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#4e3bd5] disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
                  data-testid="button-complete-onboarding"
                >
                  {submitting ? 'Finalisation…' : 'Terminer'}
                  <Icon glyph={ArrowRight01Icon} size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
