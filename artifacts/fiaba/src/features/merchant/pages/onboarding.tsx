import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowUpRightIcon, Store01Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { supabase } from '@/lib/supabase';
import { MerchantButton as Button } from '../components/merchant-ui';

export function Onboarding() {
  const [, setLocation] = useLocation();
  const [role, setRole] = useState<'marchand' | 'vendeur'>('marchand');

  const handleEnter = async () => {
    // Mettre à jour le rôle du profil dans Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ role } as never)
        .eq('id', user.id);
    }
    setLocation(role === 'marchand' ? '/merchant' : '/');
  };

  return (
    <div className="merchant-grid flex min-h-[100dvh] items-center justify-center bg-[#f8f8fc] px-5 py-12">
      <div className="w-full max-w-[600px] text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-[#211c42]" data-testid="link-onboarding-logo">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#5b49e8] text-white font-[Space_Grotesk] text-xl font-bold">F</span>
          <span className="font-[Space_Grotesk] text-2xl font-bold tracking-[-.07em]">Fiaba</span>
        </Link>
        <p className="mt-12 text-xs font-bold uppercase tracking-[.18em] text-[#5b49e8]">Un dernier choix</p>
        <h1 className="mt-4 font-[Space_Grotesk] text-4xl font-bold tracking-[-.07em] sm:text-5xl">
          Comment voulez-vous faire avancer le commerce ?
        </h1>
        <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-[#77738a]">
          Votre espace s'adapte à votre rôle. Vous pourrez toujours découvrir l'autre côté du réseau.
        </p>
        <div className="mt-9 grid gap-3 sm:grid-cols-2">
          {([
            ['marchand', 'Je suis commerçant', 'Je pilote mes produits, mes campagnes et mes ventes.'],
            ['vendeur', 'Je suis vendeur', 'Je recommande des produits à ma communauté.'],
          ] as const).map(([value, title, text]) => (
            <button
              key={value}
              onClick={() => setRole(value)}
              className={`rounded-[22px] p-5 text-left transition ${role === value ? 'bg-[#efedff] shadow-sm' : 'bg-white'}`}
              data-testid={`button-onboarding-${value}`}
            >
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${role === value ? 'bg-[#5b49e8] text-white' : 'bg-[#f0efff] text-[#5b49e8]'}`}>
                <Icon glyph={value === 'marchand' ? Store01Icon : UserGroupIcon} size={19} />
              </span>
              <strong className="mt-7 block text-sm">{title}</strong>
              <span className="mt-2 block text-xs leading-5 text-[#77738a]">{text}</span>
            </button>
          ))}
        </div>
        <Button className="mt-8 w-full sm:w-auto" onClick={handleEnter}>
          Entrer dans mon espace <Icon glyph={ArrowUpRightIcon} size={16} />
        </Button>
      </div>
    </div>
  );
}
