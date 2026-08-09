import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { ArrowRight01Icon, CheckmarkCircle02Icon, SmartPhone01Icon, Store01Icon, MapPinIcon, Tag01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { haptic } from '@/lib/utils';
import { MerchantButton as Button } from '../components/merchant-ui';

const CITIES = [
  'Dakar', 'Pikine', 'Guédiawaye', 'Rufisque', 'Thiès',
  'Mbour', 'Saint-Louis', 'Kaolack', 'Ziguinchor', 'Autre',
];

const CATEGORIES = [
  'Mode & Vêtements', 'Beauté & Cosmétiques', 'High-Tech & Accessoires',
  'Maison & Décoration', 'Agroalimentaire & Épicerie', 'Sport & Fitness', 'Enfants & Bébé',
];

export function Onboarding() {
  const { profile, merchant, refetchProfile } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [shopName, setShopName] = useState('');
  const [city, setCity] = useState('Dakar');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('Mode & Vêtements');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (merchant?.name) setShopName(merchant.name);
    if (profile?.phone) setPhone(profile.phone);
    if (profile?.city) setCity(profile.city);
  }, [profile, merchant]);

  const handleComplete = async () => {
    if (!profile) return;
    setLoading(true);
    setError('');
    haptic('medium');

    try {
      // 1. Update Profile
      await (supabase.from('profiles') as any)
        .update({ phone, city, role: 'marchand' })
        .eq('id', profile.id);

      // 2. Update/Upsert Merchant
      const slugName = (shopName || 'Boutique').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const { data: existingMerchant } = await (supabase.from('merchants') as any)
        .select('id')
        .eq('owner_id', profile.id)
        .maybeSingle();

      if (existingMerchant) {
        await (supabase.from('merchants') as any)
          .update({
            name: shopName || 'Ma Boutique',
            phone,
            description: `Boutique spécialisée en ${category}`,
          })
          .eq('owner_id', profile.id);
      } else {
        await (supabase.from('merchants') as any)
          .insert({
            owner_id: profile.id,
            name: shopName || 'Ma Boutique',
            slug: `${slugName}-${profile.id.slice(0, 6)}`,
            phone,
            email: profile.email,
            description: `Boutique spécialisée en ${category}`,
          });
      }

      haptic('success');
      await refetchProfile();
      setLocation('/merchant');
    } catch (err: any) {
      console.error('Merchant onboarding error:', err);
      setError(err.message || 'Une erreur est survenue lors de la configuration.');
      haptic('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="merchant-grid flex min-h-[100dvh] items-center justify-center bg-[#f8f8fc] px-4 py-10">
      <div className="w-full max-w-[560px]">
        {/* Header Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 text-[#211c42]">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#5b49e8] text-white font-[Space_Grotesk] text-xl font-bold shadow-sm">F</span>
            <span className="font-[Space_Grotesk] text-2xl font-bold tracking-[-.07em]">Fiaba</span>
          </Link>
          <p className="mt-2 text-xs font-bold uppercase tracking-[.18em] text-[#5b49e8]">Configuration Marchand</p>
        </div>

        {/* Card */}
        <div className="rounded-[28px] bg-white p-7 shadow-lg border border-[#efedf4]">
          {/* Progress Indicator */}
          <div className="mb-8 flex items-center justify-between">
            {[0, 1].map((s) => (
              <div key={s} className="flex flex-1 items-center">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${step >= s ? 'bg-[#5b49e8] text-white shadow-md' : 'bg-[#f0efff] text-[#858195]'}`}>
                  {step > s ? <Icon glyph={CheckmarkCircle02Icon} size={16} /> : s + 1}
                </div>
                {s === 0 && <div className={`mx-2 h-1 flex-1 rounded-full transition-all ${step > 0 ? 'bg-[#5b49e8]' : 'bg-[#f0efff]'}`} />}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-6 rounded-2xl bg-rose-50 p-4 text-xs font-semibold text-rose-600 border border-rose-100">
              {error}
            </div>
          )}

          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-[Space_Grotesk] text-2xl font-bold text-[#242046]">Créez votre vitrine Marchand</h1>
                <p className="mt-1 text-xs text-[#77738a]">Présentez votre boutique aux vendeurs de la communauté.</p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-[#443e68]">Nom de votre Boutique *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="Ex: Maison Ndar, Dakar Fashion..."
                    className="w-full rounded-2xl border border-[#e7e5ef] bg-[#fbfaff] py-3.5 pl-11 pr-4 text-sm font-semibold text-[#242046] focus:border-[#5b49e8] focus:bg-white focus:outline-none"
                  />
                  <span className="absolute left-3.5 top-3.5 text-[#8b88a0]">
                    <Icon glyph={Store01Icon} size={18} />
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-[#443e68]">Ville de résidence / Siège *</label>
                <div className="relative">
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-[#e7e5ef] bg-[#fbfaff] py-3.5 pl-11 pr-4 text-sm font-semibold text-[#242046] focus:border-[#5b49e8] focus:bg-white focus:outline-none"
                  >
                    {CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <span className="absolute left-3.5 top-3.5 text-[#8b88a0]">
                    <Icon glyph={MapPinIcon} size={18} />
                  </span>
                </div>
              </div>

              <Button
                disabled={!shopName.trim()}
                onClick={() => { haptic('medium'); setStep(1); }}
                className="w-full"
              >
                Continuer <Icon glyph={ArrowRight01Icon} size={16} />
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-[Space_Grotesk] text-2xl font-bold text-[#242046]">Catégorie & Contact WhatsApp</h1>
                <p className="mt-1 text-xs text-[#77738a]">Facilitez les échanges avec vos futurs vendeurs partenaires.</p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-[#443e68]">Numéro WhatsApp Pro *</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+221 77 000 00 00"
                    className="w-full rounded-2xl border border-[#e7e5ef] bg-[#fbfaff] py-3.5 pl-11 pr-4 text-sm font-semibold text-[#242046] focus:border-[#5b49e8] focus:bg-white focus:outline-none"
                  />
                  <span className="absolute left-3.5 top-3.5 text-[#8b88a0]">
                    <Icon glyph={SmartPhone01Icon} size={18} />
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-[#443e68]">Secteur d'activité principal</label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-[#e7e5ef] bg-[#fbfaff] py-3.5 pl-11 pr-4 text-sm font-semibold text-[#242046] focus:border-[#5b49e8] focus:bg-white focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <span className="absolute left-3.5 top-3.5 text-[#8b88a0]">
                    <Icon glyph={Tag01Icon} size={18} />
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="rounded-2xl border border-[#e7e5ef] px-5 py-3.5 text-xs font-bold text-[#77738a] hover:bg-slate-50"
                >
                  Retour
                </button>
                <Button
                  disabled={loading || !phone.trim()}
                  onClick={handleComplete}
                  className="flex-1"
                >
                  {loading ? 'Finalisation...' : 'Lancer ma boutique'} <Icon glyph={CheckmarkCircle02Icon} size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
