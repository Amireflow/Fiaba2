import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight01Icon, CheckmarkCircle02Icon, SmartPhone01Icon, UserGroupIcon, MapPinIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { haptic } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

const NICHES = [
  'Tech', 'Mode', 'Beauté', 'Maison', 'Food', 'Sport',
  'Gaming', 'Bébé', 'Éducation', 'Luxe',
];

const CITIES = [
  'Dakar', 'Pikine', 'Guédiawaye', 'Rufisque', 'Thiès',
  'Mbour', 'Saint-Louis', 'Kaolack', 'Ziguinchor', 'Autre',
];

export function SellerOnboarding() {
  const { profile, fetchProfile } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [audienceType, setAudienceType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile?.phone) setPhone(profile.phone);
    if (profile?.city) setCity(profile.city);
  }, [profile]);

  const toggleNiche = (niche: string) => {
    haptic('light');
    setSelectedNiches(prev =>
      prev.includes(niche)
        ? prev.filter(n => n !== niche)
        : [...prev, niche]
    );
  };

  const canProceed = () => {
    if (step === 0) return phone.length >= 8;
    if (step === 1) return selectedNiches.length > 0;
    if (step === 2) return city.length > 0;
    return true;
  };

  const handleComplete = async () => {
    if (!profile) return;
    setLoading(true);
    setError('');
    haptic('medium');

    try {
      // Update profile
      await supabase
        .from('profiles')
        .update({ phone, city } as never)
        .eq('id', profile.id);

      // Update seller profile
      await supabase
        .from('seller_profiles')
        .update({
          city,
          audience_type: audienceType || null,
        } as never)
        .eq('profile_id', profile.id);

      // Fetch niche IDs and insert seller_niches
      const { data: nicheRows } = await supabase
        .from('niches')
        .select('id, name')
        .in('name', selectedNiches)
        .eq('type', 'category');

      if (nicheRows && nicheRows.length > 0) {
        // Get seller record
        const { data: seller } = await supabase
          .from('sellers')
          .select('id')
          .eq('profile_id', profile.id)
          .single();

        const sellerId = (seller as { id: string } | null)?.id;
        const niches = nicheRows as { id: string; name: string }[];
        if (sellerId) {
          const inserts = niches.map(n => ({
            seller_id: sellerId,
            niche_id: n.id,
          }));
          await supabase.from('seller_niches').upsert(inserts as never);
        }
      }

      haptic('success');
      // Analytics: niche_selected (CDC §25)
      trackEvent('niche_selected', {
        metadata: { niches: selectedNiches, city },
      });
      await fetchProfile(profile.id);
      setLocation('/seller');
    } catch (e) {
      haptic('error');
      setError('Une erreur est survenue. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    haptic('light');
    if (step < 2) setStep(step + 1);
    else handleComplete();
  };

  const steps = ['Téléphone', 'Niches', 'Localisation'];

  return (
    <div className="merchant-grid flex min-h-[100dvh] items-center justify-center bg-[#f8f8fc] px-4 py-10">
      <div className="w-full max-w-[480px]">
        {/* Logo */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-2.5 text-[#211c42]">
            <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#5b49e8] text-white shadow-sm">
              <span className="font-[Space_Grotesk] text-xl font-bold">F</span>
            </span>
            <span className="font-[Space_Grotesk] text-2xl font-bold tracking-[-.07em]">Fiaba</span>
          </span>
        </div>

        {/* Progress */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold transition ${i <= step ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#8b88a0]'}`}>
                {i < step ? <Icon glyph={CheckmarkCircle02Icon} size={12} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                {label}
              </div>
              {i < steps.length - 1 && <div className={`h-px w-4 ${i < step ? 'bg-[#5b49e8]' : 'bg-[#e7e5ef]'}`} />}
            </div>
          ))}
        </div>

        <div className="rounded-[28px] bg-[#fffefd] p-7 shadow-md">
          {/* Step 0: Phone */}
          {step === 0 && (
            <div>
              <div className="mb-4 flex items-center gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]">
                  <Icon glyph={SmartPhone01Icon} size={20} />
                </span>
                <div>
                  <h2 className="font-[Space_Grotesk] text-lg font-bold text-[#282441]">Votre téléphone</h2>
                  <p className="text-xs text-[#77738a]">Pour vous contacter sur les ventes et paiements</p>
                </div>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+221 77 123 45 67"
                className="w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-1 focus:ring-[#5b49e8]"
                data-testid="input-seller-onboarding-phone"
              />
            </div>
          )}

          {/* Step 1: Niches */}
          {step === 1 && (
            <div>
              <div className="mb-4 flex items-center gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]">
                  <Icon glyph={UserGroupIcon} size={20} />
                </span>
                <div>
                  <h2 className="font-[Space_Grotesk] text-lg font-bold text-[#282441]">Vos niches</h2>
                  <p className="text-xs text-[#77738a]">Sélectionnez les domaines où vous influencez</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {NICHES.map(niche => (
                  <button
                    key={niche}
                    type="button"
                    onClick={() => toggleNiche(niche)}
                    className={`rounded-full px-4 py-2 text-xs font-bold transition ${selectedNiches.includes(niche) ? 'bg-[#5b49e8] text-white' : 'bg-[#f0eff5] text-[#514b71] hover:bg-[#efedff]'}`}
                    data-testid={`button-niche-${niche}`}
                  >
                    {niche}
                  </button>
                ))}
              </div>
              <div className="mt-5">
                <label className="block text-xs font-bold text-[#514b71]">Type d'audience (optionnel)
                  <input
                    type="text"
                    value={audienceType}
                    onChange={e => setAudienceType(e.target.value)}
                    placeholder="Ex: jeunes urbains, mamans, étudiants..."
                    className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-1 focus:ring-[#5b49e8]"
                    data-testid="input-seller-onboarding-audience"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <div>
              <div className="mb-4 flex items-center gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]">
                  <Icon glyph={MapPinIcon} size={20} />
                </span>
                <div>
                  <h2 className="font-[Space_Grotesk] text-lg font-bold text-[#282441]">Votre ville</h2>
                  <p className="text-xs text-[#77738a]">Pour matcher avec les campagnes de votre zone</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {CITIES.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { haptic('light'); setCity(c); }}
                    className={`rounded-xl border p-3 text-xs font-bold transition ${city === c ? 'border-[#5b49e8] bg-[#efedff] text-[#5040cf]' : 'border-[#e7e5ef] text-[#757185]'}`}
                    data-testid={`button-city-${c}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="mt-4 text-center text-xs font-bold text-[#c45667]">{error}</p>}

          {/* Actions */}
          <div className="mt-6 flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => { haptic('light'); setStep(step - 1); }}
                className="flex-1 rounded-full bg-[#f0eff5] px-5 py-3 text-sm font-bold text-[#514b71] transition hover:bg-[#efedff]"
                data-testid="button-onboarding-back"
              >
                Retour
              </button>
            )}
            <button
              type="button"
              disabled={!canProceed() || loading}
              onClick={next}
              className="flex-[2] rounded-full bg-[#5b49e8] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#4e3bd5] disabled:opacity-50"
              data-testid="button-onboarding-next"
            >
              {loading ? 'Enregistrement…' : step === 2 ? 'Terminer' : 'Continuer'}
              {!loading && <Icon glyph={ArrowRight01Icon} size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
