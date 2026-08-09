import { type ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowDown01Icon,
  ArrowUpRight01Icon,
  Chart02Icon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  Home01Icon,
  Menu01Icon,
  Notification01Icon,
  Search01Icon,
  Store01Icon,
  UserGroupIcon,
  ViewIcon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();
type Icon = typeof Home01Icon;

const icon = (glyph: Icon, size = 18, stroke = 1.8) => (
  <HugeiconsIcon icon={glyph} size={size} strokeWidth={stroke} />
);

function Logo({ light = false }: { light?: boolean }) {
  return (
    <a href="#top" className={`flex items-center gap-2.5 ${light ? 'text-white' : 'text-[#211c42]'}`} data-testid="link-logo">
      <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-[#5b49e8] text-white shadow-[0_7px_18px_rgba(91,73,232,.23)]">
        {icon(Store01Icon, 20, 2)}
      </span>
      <span className="font-[var(--app-font-serif)] text-[21px] font-bold tracking-[-.06em]">Fiaba</span>
    </a>
  );
}

function Button({ children, variant = 'primary', className = '', onClick, type = 'button', testId }: {
  children: ReactNode; variant?: 'primary' | 'soft' | 'ghost' | 'white'; className?: string; onClick?: () => void; type?: 'button' | 'submit'; testId?: string;
}) {
  const styles = {
    primary: 'bg-[#5b49e8] text-white shadow-[0_10px_22px_rgba(91,73,232,.2)] hover:bg-[#4e3bd5]',
    soft: 'bg-[#efedff] text-[#5040cf] hover:bg-[#e4e1ff]',
    ghost: 'text-[#514b71] hover:bg-[#f0eff8]',
    white: 'bg-white text-[#5040cf] hover:bg-[#f3f0ff]',
  };
  return <button type={type} onClick={onClick} data-testid={testId} className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition duration-200 hover:-translate-y-0.5 active:translate-y-0 ${styles[variant]} ${className}`}>{children}</button>;
}

function DashboardPreview() {
  const [active, setActive] = useState('Vue d’ensemble');
  const [showBalance, setShowBalance] = useState(true);
  const tabs = ['Vue d’ensemble', 'Campagnes', 'Ventes'];
  return (
    <div className="relative mx-auto w-full max-w-[1060px]" id="demo">
      <div className="absolute -inset-5 -z-10 rounded-[34px] bg-[#e7e3ff] blur-2xl opacity-70" />
      <div className="overflow-hidden rounded-[25px] border border-[#dedcf1] bg-[#f9f9fc] shadow-[0_25px_70px_rgba(58,45,145,.15)]">
        <div className="flex min-h-[580px]">
          <aside className="hidden w-[205px] shrink-0 flex-col bg-[#242046] p-5 text-white md:flex">
            <Logo light />
            <div className="mt-12 space-y-1">
              {[[Home01Icon, 'Vue d’ensemble'], [Store01Icon, 'Campagnes'], [Chart02Icon, 'Ventes'], [Wallet01Icon, 'Portefeuille']].map(([glyph, label]) => (
                <button onClick={() => setActive(label as string)} key={label as string} data-testid={`button-dashboard-${label}`} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[12px] font-medium transition ${active === label ? 'bg-[#5d4ce7] text-white' : 'text-[#c1bdd8] hover:bg-white/10'}`}>
                  {icon(glyph as Icon, 17)} {label as string}
                </button>
              ))}
            </div>
            <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-3 text-[11px] text-[#c1bdd8]">
              <p className="font-bold text-white">Besoin d’un coup de main ?</p>
              <p className="mt-1 leading-4">Notre équipe est à Dakar, comme vous.</p>
              <button className="mt-3 font-bold text-[#a99fff]" data-testid="button-support">Parler à l’équipe →</button>
            </div>
          </aside>
          <main className="min-w-0 flex-1 p-4 sm:p-7">
            <div className="flex items-center justify-between">
              <div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#8b88a0]">Mercredi 12 juin 2024</p><h3 className="mt-1 font-[var(--app-font-serif)] text-xl font-bold tracking-[-.04em] text-[#292541]">Bonjour, Aminata</h3></div>
              <div className="flex items-center gap-2"><button className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#716e84]" data-testid="button-search">{icon(Search01Icon, 17)}</button><button className="relative grid h-9 w-9 place-items-center rounded-full bg-white text-[#716e84]" data-testid="button-notifications">{icon(Notification01Icon, 17)}<i className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#ef6d78]" /></button><span className="grid h-9 w-9 place-items-center rounded-full bg-[#dfdbff] text-xs font-bold text-[#5140d4]">AN</span></div>
            </div>
            <div className="mt-6 flex gap-2 overflow-auto pb-1">{tabs.map(tab => <button key={tab} onClick={() => setActive(tab)} data-testid={`button-tab-${tab}`} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold ${active === tab ? 'bg-[#5b49e8] text-white' : 'bg-white text-[#88859b]'}`}>{tab}</button>)}</div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
              <div className="relative overflow-hidden rounded-[21px] bg-[#5745df] p-6 text-white">
                <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full border-[20px] border-white/10" />
                <div className="relative flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-[.13em] text-[#d0caff]">Solde disponible</span><button onClick={() => setShowBalance(!showBalance)} className="rounded-full bg-white/10 p-1.5" data-testid="button-toggle-balance">{icon(ViewIcon, 16)}</button></div>
                <div className="relative mt-4 font-[var(--app-font-serif)] text-3xl font-bold tracking-[-.06em]">{showBalance ? '107 450' : '•• •••'} <small className="font-[var(--app-font-sans)] text-sm tracking-normal text-[#d0caff]">FCFA</small></div>
                <Button variant="white" className="relative mt-5 px-4 py-2.5 text-xs" onClick={() => setShowBalance(true)} testId="button-withdraw">{icon(Wallet01Icon, 16)} Retirer mes fonds</Button>
                <div className="relative mt-6 grid grid-cols-2 border-t border-white/20 pt-4 text-[11px] text-[#d0caff]"><span>Encaissements en cours<strong className="mt-1 block text-sm text-white">2 115 F</strong></span><span className="border-l border-white/20 pl-5">Total ventes générées<strong className="mt-1 block text-sm text-white">114 500 F</strong></span></div>
              </div>
              <div className="rounded-[21px] bg-white p-5">
                <div className="flex items-center justify-between"><p className="text-xs font-bold text-[#6f6b80]">Performance des ventes</p><span className="rounded-full bg-[#e9faf3] px-2 py-1 text-[10px] font-bold text-[#2d9b71]">+18.4%</span></div>
                <div className="mt-4 flex items-end gap-2"><strong className="font-[var(--app-font-serif)] text-2xl text-[#292541]">114 500 F</strong><span className="mb-1 text-[10px] text-[#9491a5]">ce mois</span></div>
                <div className="mt-4 flex h-[92px] items-end gap-2 border-b border-[#eeeef5] px-1">{[31,48,38,57,46,70,62,85,75,100,88,94].map((height, i) => <div key={i} className={`flex-1 rounded-t-md ${i > 8 ? 'bg-[#5b49e8]' : 'bg-[#dedbfa]'}`} style={{height: `${height}%`}} />)}</div>
                <div className="mt-2 flex justify-between text-[9px] text-[#aaa7b8]"><span>Mai</span><span>Juin</span></div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">{[['Ventes validées', '42', CheckmarkCircle02Icon, 'text-[#31a37a]'], ['Commandes en cours', '08', Store01Icon, 'text-[#5b49e8]'], ['Taux de conversion', '7,8%', UserGroupIcon, 'text-[#ed8d35]']].map(([label, value, glyph, color], i) => <div className="rounded-[17px] bg-white p-4" key={label as string}><span className={`${color}`}>{icon(glyph as Icon, 18)}</span><p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">{label as string}</p><strong className="mt-1 block font-[var(--app-font-serif)] text-xl text-[#292541]">{value as string}</strong></div>)}</div>
            <div className="mt-4 rounded-[17px] bg-white p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold text-[#3a3650]">Dernières commandes</p><button className="text-[11px] font-bold text-[#5b49e8]" data-testid="button-view-orders">Voir tout →</button></div><div className="mt-3 flex items-center justify-between border-t border-[#f1f0f6] pt-3 text-xs"><span className="font-bold text-[#3a3650]">CMD-2024-001</span><span className="text-[#9591a5]">2 articles · 16 500 F</span><span className="rounded-full bg-[#e9faf3] px-2 py-1 text-[10px] font-bold text-[#2d9b71]">Livrée</span></div></div>
          </main>
        </div>
      </div>
    </div>
  );
}

function SignupDialog({ onClose }: { onClose: () => void }) {
  const [role, setRole] = useState<'marchand' | 'vendeur'>('vendeur');
  const [submitted, setSubmitted] = useState(false);
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#201b3c]/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true"><div className="relative w-full max-w-md rounded-[26px] bg-[#fbfbfe] p-7 shadow-2xl"><button onClick={onClose} className="absolute right-5 top-5 text-[#858197]" data-testid="button-close-dialog">{icon(Cancel01Icon, 20)}</button>{submitted ? <div className="py-8 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8faf2] text-[#28956c]">{icon(CheckmarkCircle02Icon, 28)}</div><h3 className="mt-5 font-[var(--app-font-serif)] text-2xl font-bold text-[#282441]">C’est noté.</h3><p className="mt-2 text-sm leading-6 text-[#77738a]">On vous recontacte très vite pour démarrer sur Fiaba.</p><Button className="mt-6" onClick={onClose} testId="button-dialog-done">Retourner au site</Button></div> : <><p className="text-xs font-bold uppercase tracking-[.15em] text-[#5b49e8]">Premiers pas</p><h3 className="mt-2 font-[var(--app-font-serif)] text-2xl font-bold tracking-[-.04em] text-[#282441]">Construisons le commerce de demain.</h3><p className="mt-2 text-sm text-[#77738a]">Dites-nous comment vous souhaitez utiliser Fiaba.</p><div className="mt-6 grid grid-cols-2 gap-2">{[['vendeur','Je vends sur les réseaux'],['marchand','Je distribue mes produits']].map(([value, label]) => <button onClick={() => setRole(value as 'vendeur' | 'marchand')} key={value} className={`rounded-2xl border p-3 text-left text-xs font-bold ${role === value ? 'border-[#5b49e8] bg-[#efedff] text-[#5040cf]' : 'border-[#e7e5ef] text-[#757185]'}`} data-testid={`button-role-${value}`}>{label}</button>)}</div><label className="mt-5 block text-xs font-bold text-[#4a465c]">Votre adresse email<input type="email" placeholder="bonjour@exemple.com" className="mt-2 w-full rounded-xl border border-[#e3e1eb] bg-white px-4 py-3 text-sm outline-none focus:border-[#5b49e8]" data-testid="input-email" /></label><Button className="mt-5 w-full" onClick={() => setSubmitted(true)} testId="button-submit-signup">Demander un accès {icon(ArrowUpRight01Icon, 17)}</Button></>}</div></div>;
}

function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [faq, setFaq] = useState<number | null>(0);
  const faqs = [['Comment Fiaba protège-t-elle mes ventes ?', 'Chaque commande est suivie de la recommandation à la livraison. Une vente validée déclenche automatiquement votre rémunération.'], ['Est-ce que je dois avoir une communauté importante ?', 'Non. Fiaba valorise la confiance et la qualité de votre recommandation, pas seulement le nombre d’abonnés.'], ['Quand puis-je recevoir mes gains ?', 'Les gains validés sont disponibles dans votre portefeuille et peuvent être retirés simplement, selon les conditions de votre compte.']];
  return <div id="top" className="min-h-[100dvh] bg-[#f8f8fc] text-[#282441]">
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-[#e9e7f0]/80 bg-[#f8f8fc]/90 backdrop-blur-lg"><div className="mx-auto flex h-[76px] max-w-6xl items-center justify-between px-5 lg:px-8"><Logo /><nav className="hidden items-center gap-7 text-[13px] font-bold text-[#716d82] md:flex"><a href="#comment" data-testid="link-how">Comment ça marche</a><a href="#espace" data-testid="link-space">L’espace Fiaba</a><a href="#temoignages" data-testid="link-stories">Ils en parlent</a></nav><div className="hidden items-center gap-3 md:flex"><button className="px-4 py-2 text-sm font-bold text-[#5d5772]" onClick={() => setDialog(true)} data-testid="button-login">Se connecter</button><Button className="px-4 py-2.5" onClick={() => setDialog(true)} testId="button-header-start">Commencer</Button></div><button className="rounded-xl p-2 text-[#514b71] md:hidden" onClick={() => setMenuOpen(!menuOpen)} data-testid="button-mobile-menu">{icon(menuOpen ? Cancel01Icon : Menu01Icon, 22)}</button></div>{menuOpen && <div className="border-t border-[#e9e7f0] bg-[#f8f8fc] px-5 pb-5 pt-2 md:hidden"><a href="#comment" onClick={() => setMenuOpen(false)} className="block py-3 text-sm font-bold" data-testid="link-mobile-how">Comment ça marche</a><a href="#espace" onClick={() => setMenuOpen(false)} className="block py-3 text-sm font-bold" data-testid="link-mobile-space">L’espace Fiaba</a><Button className="mt-2 w-full" onClick={() => setDialog(true)} testId="button-mobile-start">Commencer</Button></div>}</header>
    <main>
      <section className="fiaba-grid relative overflow-hidden px-5 pb-20 pt-36 lg:pb-28 lg:pt-48"><div className="pointer-events-none absolute -right-24 top-20 h-80 w-80 rounded-full bg-[#dcd7ff] blur-3xl" /><div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.02fr_.98fr]"><div className="relative z-10 reveal"><div className="inline-flex items-center gap-2 rounded-full border border-[#dedafb] bg-white/70 px-3 py-2 text-[11px] font-bold text-[#5e51c9]"><span className="h-1.5 w-1.5 rounded-full bg-[#5b49e8]" /> Le commerce avance ensemble</div><h1 className="mt-6 max-w-[650px] font-[var(--app-font-serif)] text-[clamp(3.15rem,7vw,6.5rem)] font-bold leading-[.92] tracking-[-.09em] text-[#27223f]">Vendez plus.<br /><span className="text-[#5b49e8]">Ensemble.</span></h1><p className="mt-7 max-w-[500px] text-base leading-7 text-[#706c81] sm:text-lg">Fiaba connecte les marques ambitieuses aux personnes qui savent les faire découvrir. Une nouvelle façon de faire circuler les produits au Sénégal.</p><div className="mt-8 flex flex-wrap items-center gap-3"><Button onClick={() => setDialog(true)} testId="button-hero-start">Rejoindre Fiaba {icon(ArrowUpRight01Icon, 17)}</Button><a href="#espace" className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-[#625d77] hover:bg-white" data-testid="link-hero-demo">Voir la plateforme <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[#5b49e8]">↓</span></a></div><div className="mt-9 flex items-center gap-3 text-xs text-[#858195]"><div className="flex -space-x-2"><span className="grid h-7 w-7 place-items-center rounded-full border-2 border-[#f8f8fc] bg-[#e8c6a7] text-[9px] font-bold">AN</span><span className="grid h-7 w-7 place-items-center rounded-full border-2 border-[#f8f8fc] bg-[#abb9dc] text-[9px] font-bold">MK</span><span className="grid h-7 w-7 place-items-center rounded-full border-2 border-[#f8f8fc] bg-[#e6b2ca] text-[9px] font-bold">FD</span></div><span>Déjà adopté par des équipes à Dakar</span></div></div><div className="relative reveal reveal-delay-2"><div className="float rounded-[30px] border border-white/80 bg-white/70 p-3 shadow-[0_22px_80px_rgba(83,66,198,.14)] sm:p-5"><div className="rounded-[22px] bg-[#f1efff] p-4 sm:p-6"><div className="mb-5 flex items-center justify-between"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#5b49e8] text-white">{icon(Store01Icon, 17)}</span><span className="font-[var(--app-font-serif)] text-sm font-bold">Fiaba</span></div><span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold text-[#8d899d]">Aperçu vendeur</span></div><div className="rounded-[18px] bg-[#5b49e8] p-5 text-white"><p className="text-[10px] font-bold uppercase tracking-wider text-[#d2ccff]">Gains ce mois-ci</p><strong className="mt-3 block font-[var(--app-font-serif)] text-3xl tracking-[-.06em]">68 250 <small className="font-[var(--app-font-sans)] text-xs tracking-normal">FCFA</small></strong><div className="mt-5 flex items-end gap-1">{[24,33,28,44,39,52,48,64,57,76,70,88].map((h,i) => <div key={i} className="flex-1 rounded-t-sm bg-white/30" style={{height: `${h/2}px`}} />)}</div></div><div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white p-4"><span className="text-[#5b49e8]">{icon(Chart02Icon, 18)}</span><p className="mt-3 text-[10px] text-[#9b98aa]">Ventes validées</p><strong className="mt-1 block text-lg">24</strong></div><div className="rounded-2xl bg-white p-4"><span className="text-[#32a17a]">{icon(Wallet01Icon, 18)}</span><p className="mt-3 text-[10px] text-[#9b98aa]">À retirer</p><strong className="mt-1 block text-lg">12 500 F</strong></div></div></div></div><div className="absolute -bottom-4 -left-4 rounded-2xl border border-[#e7e4ff] bg-white p-3 shadow-lg sm:-left-9"><div className="flex items-center gap-2 text-xs font-bold text-[#3f3a59]"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#e7f9f1] text-[#2d9e72]">{icon(CheckmarkCircle02Icon, 16)}</span> Vente validée <span className="text-[#2d9e72]">+4 500 F</span></div></div></div></div></section>
      <section className="bg-[#5b49e8] px-5 py-6 text-white"><div className="mx-auto grid max-w-6xl gap-5 text-center sm:grid-cols-3 sm:text-left"><div><strong className="font-[var(--app-font-serif)] text-2xl">1 200+</strong><p className="mt-1 text-xs text-[#d5cfff]">vendeurs en mouvement</p></div><div><strong className="font-[var(--app-font-serif)] text-2xl">86M F</strong><p className="mt-1 text-xs text-[#d5cfff]">de ventes accompagnées</p></div><div><strong className="font-[var(--app-font-serif)] text-2xl">Dakar → partout</strong><p className="mt-1 text-xs text-[#d5cfff]">un réseau qui grandit localement</p></div></div></section>
      <section id="comment" className="px-5 py-24 lg:py-32"><div className="mx-auto max-w-6xl"><div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#5b49e8]">Le modèle Fiaba</p><h2 className="mt-4 font-[var(--app-font-serif)] text-4xl font-bold leading-tight tracking-[-.06em] sm:text-5xl">Une bonne recommandation peut changer une journée.</h2><p className="mt-5 leading-7 text-[#77738a]">Fiaba rend cette valeur visible, mesurable et rémunérée. Pour les marques comme pour celles et ceux qui les font vivre.</p></div><div className="mt-16 grid gap-5 md:grid-cols-3">{[['01','Le marchand équipe','Déposez vos produits, fixez votre commission et lancez une campagne qui a du sens.'],['02','Le vendeur choisit','Découvrez des offres faites pour votre audience et partagez-les avec vos mots.'],['03','La vente circule','Fiaba suit chaque étape. Une vente livrée, une rémunération claire.']].map(([num,title,text]) => <div className="group rounded-[24px] border border-[#e8e6f0] bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-[#c9c3fb] hover:shadow-[0_18px_40px_rgba(82,64,190,.08)]" key={num}><span className="font-[var(--app-font-serif)] text-sm font-bold text-[#5b49e8]">{num}</span><h3 className="mt-16 font-[var(--app-font-serif)] text-xl font-bold tracking-[-.04em]">{title}</h3><p className="mt-3 text-sm leading-6 text-[#77738a]">{text}</p><span className="mt-8 block text-[#5b49e8] transition group-hover:translate-x-1">↗</span></div>)}</div></div></section>
      <section id="espace" className="bg-[#f0effa] px-5 py-24 lg:py-32"><div className="mx-auto max-w-6xl"><div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#5b49e8]">L’espace Fiaba</p><h2 className="mt-4 max-w-2xl font-[var(--app-font-serif)] text-4xl font-bold tracking-[-.06em] sm:text-5xl">Tout ce qu’il faut pour garder une longueur d’avance.</h2></div><p className="max-w-xs text-sm leading-6 text-[#77738a]">Un espace simple pour piloter vos campagnes, vos ventes et votre croissance au quotidien.</p></div><DashboardPreview /></div></section>
      <section className="px-5 py-24 lg:py-32"><div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[.8fr_1.2fr]"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#5b49e8]">Pour les marques</p><h2 className="mt-4 font-[var(--app-font-serif)] text-4xl font-bold leading-tight tracking-[-.06em] sm:text-5xl">Vos produits méritent plus qu’un simple post.</h2><p className="mt-5 leading-7 text-[#77738a]">Transformez votre réseau en force commerciale. Vous gardez le contrôle, vos vendeurs gardent leur voix.</p><Button className="mt-7" variant="soft" onClick={() => setDialog(true)} testId="button-merchant-start">Lancer une campagne {icon(ArrowUpRight01Icon, 17)}</Button></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-[23px] bg-[#e8e4ff] p-6 sm:translate-y-7"><span className="text-[#5b49e8]">{icon(UserGroupIcon, 23)}</span><h3 className="mt-14 font-[var(--app-font-serif)] text-xl font-bold">Le bon réseau, au bon moment</h3><p className="mt-2 text-sm leading-6 text-[#6f6a83]">Trouvez les profils qui parlent déjà à vos futurs clients.</p></div><div className="rounded-[23px] bg-[#e5f8f1] p-6"><span className="text-[#2d9a70]">{icon(Chart02Icon, 23)}</span><h3 className="mt-14 font-[var(--app-font-serif)] text-xl font-bold">Des chiffres qui racontent</h3><p className="mt-2 text-sm leading-6 text-[#6f6a83]">Chaque partage devient une donnée utile pour grandir.</p></div></div></div></section>
      <section id="temoignages" className="bg-[#242046] px-5 py-24 text-white lg:py-32"><div className="mx-auto max-w-6xl"><div className="flex flex-col justify-between gap-8 md:flex-row"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#a9a0ff]">Paroles du réseau</p><h2 className="mt-4 max-w-xl font-[var(--app-font-serif)] text-4xl font-bold tracking-[-.06em] sm:text-5xl">Le commerce, quand il redevient humain.</h2></div><div className="max-w-sm text-3xl leading-tight text-[#dcd8ff]">“Enfin un outil qui comprend comment on vend vraiment ici.”<p className="mt-5 text-xs font-bold uppercase tracking-widest text-[#9992c2]">— Marième, vendeuse à Guédiawaye</p></div></div></div></section>
      <section className="px-5 py-24 lg:py-32"><div className="mx-auto max-w-3xl"><div className="text-center"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#5b49e8]">Questions utiles</p><h2 className="mt-4 font-[var(--app-font-serif)] text-4xl font-bold tracking-[-.06em]">On vous explique tout.</h2></div><div className="mt-10 divide-y divide-[#e7e5ee] border-y border-[#e7e5ee]">{faqs.map(([question, answer], i) => <div key={question}><button onClick={() => setFaq(faq === i ? null : i)} className="flex w-full items-center justify-between py-5 text-left font-bold" data-testid={`button-faq-${i}`}><span>{question}</span><span className={`text-[#5b49e8] transition ${faq === i ? 'rotate-180' : ''}`}>{icon(ArrowDown01Icon, 18)}</span></button>{faq === i && <p className="max-w-2xl pb-5 pr-8 text-sm leading-6 text-[#77738a]">{answer}</p>}</div>)}</div></div></section>
      <section className="px-5 pb-24"><div className="mx-auto max-w-6xl overflow-hidden rounded-[28px] bg-[#5b49e8] px-6 py-14 text-center text-white sm:px-12"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#d5cfff]">À vous de jouer</p><h2 className="mx-auto mt-4 max-w-2xl font-[var(--app-font-serif)] text-4xl font-bold tracking-[-.07em] sm:text-6xl">La prochaine vente commence peut-être par vous.</h2><Button variant="white" className="mt-8" onClick={() => setDialog(true)} testId="button-final-start">Commencer avec Fiaba {icon(ArrowUpRight01Icon, 17)}</Button></div></section>
    </main>
    <footer className="border-t border-[#e8e6ef] px-5 py-8"><div className="mx-auto flex max-w-6xl flex-col justify-between gap-5 sm:flex-row sm:items-center"><Logo /><p className="text-xs text-[#8a8799]">Pensé à Dakar. Construit pour aller loin.</p><p className="text-xs font-bold text-[#77738a]">© 2024 Fiaba</p></div></footer>
    {dialog && <SignupDialog onClose={() => setDialog(false)} />}
  </div>;
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={Home} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}
function RoutedErrorBoundary({ children }: { children: ReactNode }) { const [location] = useLocation(); return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>; }
function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>; }
export default App;