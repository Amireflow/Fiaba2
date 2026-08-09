import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Alert01Icon, Cancel01Icon, CheckmarkCircle02Icon, DashboardSquare01Icon, Logout01Icon, Menu02Icon, Notification01Icon, Search01Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { useToast } from '@/hooks/use-toast';
import { AdminLogo } from './admin-ui';
import { adminPrimaryNav, adminSecondaryNav, adminAllNav } from '@/config/admin-navigation';

/* Bottom nav items (4 shortcuts + Plus button) */
const bottomNav = [
  { href: '/admin', label: 'Accueil', glyph: DashboardSquare01Icon },
  { href: '/admin/users', label: 'Utilisateurs', glyph: UserGroupIcon },
  { href: '/admin/orders', label: 'Commandes', glyph: CheckmarkCircle02Icon },
  { href: '/admin/disputes', label: 'Litiges', glyph: Alert01Icon },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobile, setMobile] = useState(false);
  const { toast } = useToast();

  const handleSignOut = () => {
    window.location.href = import.meta.env.BASE_URL;
  };

  const navLink = (item: (typeof adminAllNav)[number], isMobile = false) => {
    const isActive = location === item.href;
    const base = isMobile
      ? `flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold transition ${isActive ? 'bg-[#5e4be7] text-white' : 'text-[#c1bdd8] hover:bg-white/10'}`
      : `flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-bold transition ${isActive ? 'bg-[#5e4be7] text-white shadow-sm' : 'text-[#c1bdd8] hover:bg-white/10'}`;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => isMobile && setMobile(false)}
        className={base}
        data-testid={`link-${isMobile ? 'mobile-' : ''}admin-nav-${item.href.split('/').pop()}`}
      >
        <Icon glyph={item.glyph} size={isMobile ? 18 : 17} />
        {item.label}
        {item.href === '/admin/disputes' && <span className="ml-auto rounded-full bg-[#fff0f1] px-1.5 py-0.5 text-[9px] text-[#c45667]">2</span>}
        {item.href === '/admin/fraud' && <span className="ml-auto rounded-full bg-[#fff4de] px-1.5 py-0.5 text-[9px] text-[#ac741e]">5</span>}
      </Link>
    );
  };

  return (
    <div className="merchant-noise admin-shell min-h-[100dvh] text-[#282441]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[242px] flex-col overflow-y-auto bg-[#1c1838] px-4 py-6 text-white lg:flex dark-scrollbar">
        <div className="px-2"><AdminLogo /></div>
        <div className="mt-12 px-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#9791c5]">Contrôle plateforme</div>
        <nav className="mt-3 space-y-1">{adminPrimaryNav.map((item) => navLink(item))}</nav>
        <div className="mt-8 px-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#9791c5]">Confiance & référentiels</div>
        <nav className="mt-3 space-y-1">{adminSecondaryNav.map((item) => navLink(item))}</nav>
        <div className="mt-auto rounded-2xl bg-white/5 p-3">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#fff4de] text-[10px] font-bold text-[#ac741e]">!</span>
            <span className="text-[11px] font-bold">Journal d'audit actif</span>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-[#b7b2d2]">Chaque action sensible est tracée.</p>
        </div>
        <button onClick={() => handleSignOut()} className="mt-4 flex items-center gap-3 px-3 py-2 text-xs font-bold text-[#c1bdd8] hover:text-white" data-testid="button-admin-logout">
          Quitter l'espace <Icon glyph={Logout01Icon} size={16} className="ml-auto" />
        </button>
      </aside>

      {/* Header */}
      <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between bg-[#f8f8fc] px-4 sm:px-5 lg:ml-[242px] lg:h-[70px] lg:px-9">
        <div className="flex items-center gap-3">
          <div className="lg:hidden">
            <AdminLogo light={false} />
          </div>
          <div className="hidden lg:block">
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8b88a0]">Console administrateur</p>
            <p className="mt-1 text-sm font-bold text-[#38324f]">Plateforme · Sénégal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#716e84] shadow-sm"
            onClick={() => toast({ title: 'Recherche globale à venir', description: 'Recherche utilisateurs, commandes et campagnes.' })}
            data-testid="button-admin-search"
          >
            <Icon glyph={Search01Icon} size={17} />
          </button>
          <button
            className="relative grid h-9 w-9 place-items-center rounded-full bg-white text-[#716e84] shadow-sm"
            onClick={() => toast({ title: '5 alertes à examiner', description: '2 litiges, 3 signaux de fraude.' })}
            data-testid="button-admin-notifications"
          >
            <Icon glyph={Notification01Icon} size={17} />
            <i className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#ef6d78]" />
          </button>
          <span className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-[#dfdbff] text-xs font-bold text-[#5140d4]" data-testid="text-admin-initials">AD</span>
        </div>
      </header>

      {/* Mobile drawer sidebar (opened by plus button) */}
      {mobile && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[#201b3c]/75" onClick={() => setMobile(false)} data-testid="admin-mobile-overlay" />
          <div className="absolute left-0 top-0 flex h-full w-[300px] flex-col bg-[#1c1838] px-4 py-6 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <AdminLogo />
              <button onClick={() => setMobile(false)} className="rounded-lg p-1.5 text-[#c1bdd8] hover:bg-white/10" data-testid="button-close-admin-mobile">
                <Icon glyph={Cancel01Icon} size={22} />
              </button>
            </div>
            <div className="mt-8 px-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#9791c5]">Contrôle plateforme</div>
            <nav className="mt-3 space-y-1">{adminPrimaryNav.map((item) => navLink(item, true))}</nav>
            <div className="mt-6 px-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#9791c5]">Confiance & référentiels</div>
            <nav className="mt-3 space-y-1">{adminSecondaryNav.map((item) => navLink(item, true))}</nav>
            <button onClick={() => handleSignOut()} className="mt-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-[#c1bdd8] hover:bg-white/10" data-testid="button-admin-mobile-logout">
              Quitter l'espace <Icon glyph={Logout01Icon} size={16} className="ml-auto" />
            </button>
          </div>
        </div>
      )}

      {/* Main content with bottom padding on mobile for the footer nav */}
      <main className="min-h-[calc(100dvh-64px)] pb-[88px] lg:ml-[242px] lg:min-h-[calc(100dvh-70px)] lg:pb-0">{children}</main>

      {/* Mobile floating bottom navigation — glassmorphism */}
      <nav
        className="fixed inset-x-4 bottom-4 z-30 flex h-[64px] items-center justify-around rounded-[24px] bg-white/90 shadow-[0_8px_32px_rgba(36,32,70,.12)] backdrop-blur-xl lg:hidden"
        data-testid="admin-bottom-nav"
      >
        <span className="pointer-events-none absolute inset-0 rounded-[24px] bg-gradient-to-b from-white/30 to-transparent" />

        {bottomNav.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[9px] font-bold transition-all duration-200 ${isActive ? 'text-[#5b49e8]' : 'text-[#9290a2] active:scale-90'}`}
              data-testid={`link-admin-bottom-${item.href.split('/').pop()}`}
            >
              <span className={`grid place-items-center rounded-xl transition-all duration-200 ${isActive ? 'h-8 w-8 bg-[#5b49e8]/10' : 'h-7 w-7'}`}>
                <Icon glyph={item.glyph} size={isActive ? 20 : 18} strokeWidth={isActive ? 2.1 : 1.8} />
              </span>
              <span className={isActive ? 'opacity-100' : 'opacity-70'}>{item.label}</span>
              {item.href === '/admin/disputes' && (
                <span className="absolute right-[26%] top-1.5 h-2 w-2 rounded-full bg-[#ef6d78] ring-2 ring-white/80" />
              )}
            </Link>
          );
        })}

        {/* Plus button (opens full menu drawer) */}
        <button
          onClick={() => setMobile(true)}
          className="relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[9px] font-bold text-[#9290a2] transition-all duration-200 active:scale-90"
          data-testid="button-admin-bottom-plus"
          aria-label="Ouvrir le menu"
        >
          <span className="grid h-7 w-7 place-items-center rounded-xl bg-[#5b49e8] text-white shadow-[0_4px_14px_rgba(91,73,232,.3)]">
            <Icon glyph={Menu02Icon} size={17} strokeWidth={2.2} />
          </span>
          <span className="opacity-70">Plus</span>
        </button>
      </nav>
    </div>
  );
}
