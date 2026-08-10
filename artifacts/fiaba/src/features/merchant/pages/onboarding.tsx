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
  const { user, profile, merchant, seller, refetchProfile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<'marchand' | 'vendeur'>('marchand');

  // Identity pre-filled from auth profile
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
    } else if (user) {
      if (user.user_metadata?.full_name) setFullName(user.user_metadata.full_name);
      if (user.user_metadata?.role) setRole(user.user_metadata.role);
    }
  }, [profile, user]);

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
      const activeUserId = profile?.id || user?.id;
      const activeEmail = profile?.email || user?.email || null;

      if (activeUserId) {
        // 1. Upsert Profile Location & Role
        await (supabase.from('profiles') as any).upsert({
          id: activeUserId,
          email: activeEmail,
          full_name: fullName || profile?.full_name || 'Utilisateur Fiaba',
          phone: phone || profile?.phone || null,
          city: city || 'Dakar',
          role: role,
          verification_status: 'verified',
        });

        // 2. If Merchant, ensure merchant record exists
        if (role === 'marchand') {
          let cleanStoreName = (storeName || fullName || profile?.full_name || 'Ma Boutique').trim();
          if (cleanStoreName.includes('(') && cleanStoreName.includes(')')) {
            const match = cleanStoreName.match(/\(([^)]+)\)/);
            if (match && match[1]) cleanStoreName = match[1].trim();
          }
          cleanStoreName = cleanStoreName.replace(/^(Boutique\s+)+/i, '').trim();
          if (!cleanStoreName) cleanStoreName = 'Ma Boutique';

          const slugName = cleanStoreName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const uniqueSlug = `${slugName}-${activeUserId.slice(0, 6)}-${Date.now().toString(36).slice(-4)}`;

          await (supabase.from('merchants') as any).upsert({
            owner_id: activeUserId,
            name: cleanStoreName,
            slug: uniqueSlug,
            phone: phone || profile?.phone || null,
            email: activeEmail,
            city: city || 'Dakar',
            is_active: true,
          });
        }

        // 3. If Seller, ensure seller record exists
        if (role === 'vendeur') {
          const { data: sellRecord } = await (supabase.from('sellers') as any)
            .upsert({
              profile_id: activeUserId,
              display_name: fullName || profile?.full_name || 'Vendeur Fiaba',
              phone: phone || profile?.phone || null,
              status: 'actif',
            })
            .select()
            .maybeSingle();

          const sellerId = sellRecord?.id;
          if (sellerId) {
            await (supabase.from('seller_profiles') as any).upsert({
              profile_id: activeUserId,
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

      const finalRole = (profile?.role || role) as string;
      if (finalRole === 'marchand') {
        setLocation('/merchant');
      } else if (finalRole === 'admin') {
        setLocation('/admin');
      } else {
        setLocation('/seller');
      }
    }
  };

  return (
    <div className="merchant-grid flex min-h-[100dvh] items-center justify-center bg-[#f8f8fc] px-4 py-10">
      <div className="w-full max-w-[540px] min-w-0">
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
        <div className="rounded-[28px] bg-[#fffefd] p-5 sm:p-7 shadow-md border border-[#f1effa] min-w-0">
          {/* Clean User Banner (Removed badge, single-line truncated to prevent wrap) */}
          <div className="mb-5 flex items-center rounded-2xl bg-[#efedff] px-4 py-3 text-xs min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#5b49e8] text-white font-bold">
                <Icon glyph={role === 'marchand' ? Store01Icon : UserGroupIcon} size={16} />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-[#292541] truncate">{fullName || profile?.full_name || 'Utilisateur Fiaba'}</p>
                <p className="text-[11px] text-[#5040cf] truncate">{role === 'marchand' ? 'Compte Commerçant / Marque' : 'Compte Vendeur Social'}</p>
              </div>
            </div>
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
            <div className="mt-6 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300 min-w-0">
              <div>
                <h1 className="font-[Space_Grotesk] text-xl sm:text-2xl font-bold text-[#282441] leading-tight">Votre Ville d'activité 📍</h1>
                <p className="mt-1.5 text-xs sm:text-sm text-[#77738a]">Où êtes-vous basé pour la livraison ou les opportunités ?</p>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-[#514b71] uppercase tracking-wider">Ville principale</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 min-w-0">
                  {CITIES.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => { haptic('light'); setCity(c); }}
                      className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition truncate whitespace-nowrap text-center ${
                        city === c
                          ? 'border-[#5b49e8] bg-[#efedff] text-[#5040cf]'
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
            <div className="mt-6 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300 min-w-0">
              <div>
                <h1 className="font-[Space_Grotesk] text-xl sm:text-2xl font-bold text-[#282441] leading-tight">Niches & Canaux 🛍️</h1>
                <p className="mt-1.5 text-xs sm:text-sm text-[#77738a]">Quels produits souhaitez-vous cibler et sur quels réseaux ?</p>
              </div>

              {/* Niches */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-[#514b71] uppercase tracking-wider">Secteurs & Niches d'intérêt</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                  {NICHES.map((niche) => {
                    const active = selectedNiches.includes(niche);
                    return (
                      <button
                        type="button"
                        key={niche}
                        onClick={() => toggleNiche(niche)}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-bold transition text-left min-w-0 ${
                          active
                            ? 'border-[#5b49e8] bg-[#efedff] text-[#5040cf]'
                            : 'border-[#e7e5ef] bg-white text-[#757185] hover:bg-[#f8f8fc]'
                        }`}
                      >
                        <span className="truncate pr-2">{niche}</span>
                        {active && <Icon glyph={CheckmarkCircle02Icon} size={16} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Channels (for Sellers) */}
              {role === 'vendeur' && (
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-[#514b71] uppercase tracking-wider">Vos réseaux sociaux principaux</label>
                  <div className="grid grid-cols-2 gap-2 min-w-0">
                    {CHANNELS.map((ch) => {
                      const active = selectedChannels.includes(ch.id);
                      return (
                        <button
                          type="button"
                          key={ch.id}
                          onClick={() => toggleChannel(ch.id)}
                          className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-bold transition min-w-0 ${
                            active ? 'border-[#5b49e8] bg-[#efedff] text-[#5040cf]' : 'border-[#e7e5ef] bg-white text-[#757185]'
                          }`}
                        >
                          <span className="truncate pr-1">{ch.name}</span>
                          {active && <Icon glyph={CheckmarkCircle02Icon} size={16} className="shrink-0" />}
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
                  className="rounded-full bg-[#f4f3f8] p-3 text-[#514b71] hover:bg-[#eeeaf7] shrink-0"
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
            <div className="mt-6 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300 min-w-0">
              <div className="text-center">
                <span className="mx-auto grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-2xl bg-[#e7faf2] text-[#278e69]">
                  <Icon glyph={SparklesIcon} size={28} />
                </span>
                <h1 className="mt-4 font-[Space_Grotesk] text-xl sm:text-2xl font-bold text-[#282441]">Tout est prêt ! 🚀</h1>
                <p className="mt-1.5 text-xs sm:text-sm text-[#77738a]">
                  Votre espace Fiaba est prêt pour {fullName || profile?.full_name}.
                </p>
              </div>

              <div className="rounded-2xl bg-[#f8f7fc] p-4 space-y-2.5 text-xs min-w-0">
                <div className="flex justify-between items-center py-1 border-b border-[#efedf5] min-w-0 gap-2">
                  <span className="text-[#8b88a0] shrink-0">Ville</span>
                  <strong className="text-[#292541] truncate">{city}</strong>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#efedf5] min-w-0 gap-2">
                  <span className="text-[#8b88a0] shrink-0">Niches cibles</span>
                  <strong className="text-[#292541] truncate">{selectedNiches.join(', ')}</strong>
                </div>
                {role === 'vendeur' && (
                  <div className="flex justify-between items-center py-1 min-w-0 gap-2">
                    <span className="text-[#8b88a0] shrink-0">Canaux</span>
                    <strong className="text-[#292541] truncate">{selectedChannels.join(', ')}</strong>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-full bg-[#f4f3f8] p-3 text-[#514b71] hover:bg-[#eeeaf7] shrink-0"
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
