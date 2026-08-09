import { type ReactNode, useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ArrowDown01Icon,
  ArrowUpRight01Icon,
  Chart02Icon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  DeliveryTruck01Icon,
  Fire02Icon,
  GiftIcon,
  Globe02Icon,
  HeadphonesIcon,
  Home01Icon,
  LockKeyIcon,
  Mail01Icon,
  MapPinIcon,
  Menu01Icon,
  Megaphone01Icon,
  Notification01Icon,
  Rocket01Icon,
  Search01Icon,
  Share02Icon,
  ShieldKeyIcon,
  ShoppingBag01Icon,
  SmartPhone01Icon,
  SparklesIcon,
  Store01Icon,
  Target01Icon,
  Timer01Icon,
  UserGroupIcon,
  ViewIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Icon, type IconType } from "@/components/shared/icon";
import NotFound from "@/pages/not-found";
import { AdminRouter } from "@/features/admin/admin-router";
import { MerchantRouter } from "@/features/merchant/merchant-router";
import { SellerRouter } from "@/features/seller/seller-router";
import { Onboarding } from "@/features/merchant/pages/onboarding";
import { SignInPage, SignUpPage } from "@/pages/auth";
import { Route, Switch, useLocation, Router as WouterRouter } from "wouter";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const icon = (glyph: IconType, size = 18, strokeWidth = 1.8) => (
  <Icon glyph={glyph} size={size} strokeWidth={strokeWidth} />
);

function Logo({ light = false }: { light?: boolean }) {
  return (
    <a
      href="#top"
      className={`flex items-center gap-2.5 ${light ? "text-white" : "text-[#211c42]"}`}
      data-testid="link-logo"
    >
      <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-[#5b49e8] text-white shadow-sm">
        {icon(Store01Icon, 20, 2)}
      </span>
      <span className="font-[var(--app-font-serif)] text-[21px] font-bold tracking-[-.06em]">
        Fiaba
      </span>
    </a>
  );
}

function Button({
  children,
  variant = "primary",
  className = "",
  onClick,
  type = "button",
  testId,
}: {
  children: ReactNode;
  variant?: "primary" | "soft" | "ghost" | "white" | "dark";
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  testId?: string;
}) {
  const styles: Record<string, string> = {
    primary: "bg-[#5b49e8] text-white shadow-sm hover:bg-[#4e3bd5]",
    soft: "bg-[#efedff] text-[#5040cf] hover:bg-[#e4e1ff]",
    ghost: "text-[#514b71] hover:bg-[#f0eff8]",
    white: "bg-white text-[#5040cf] hover:bg-[#f3f0ff]",
    dark: "bg-[#242046] text-white hover:bg-[#2d2850]",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      data-testid={testId}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition duration-200 hover:-translate-y-0.5 active:translate-y-0 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function DashboardPreview() {
  const [active, setActive] = useState("Vue d'ensemble");
  const [showBalance, setShowBalance] = useState(true);
  const tabs = ["Vue d'ensemble", "Campagnes", "Ventes"];
  return (
    <div className="relative mx-auto w-full max-w-[1060px]" id="demo">
      <div className="absolute -inset-5 -z-10 rounded-[34px] bg-[#e7e3ff] opacity-40 blur-xl" />
      <div className="overflow-hidden rounded-[25px] bg-[#f9f9fc]">
        <div className="flex min-h-[580px]">
          <aside className="hidden w-[205px] shrink-0 flex-col bg-[#242046] p-5 text-white md:flex">
            <Logo light />
            <div className="mt-12 space-y-1">
              {[
                [Home01Icon, "Vue d'ensemble"],
                [Store01Icon, "Campagnes"],
                [Chart02Icon, "Ventes"],
                [Wallet01Icon, "Portefeuille"],
              ].map(([glyph, label]) => (
                <button
                  onClick={() => setActive(label as string)}
                  key={label as string}
                  data-testid={`button-dashboard-${label}`}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[12px] font-medium transition ${active === label ? "bg-[#5d4ce7] text-white" : "text-[#c1bdd8] hover:bg-white/10"}`}
                >
                  {icon(glyph as IconType, 17)} {label as string}
                </button>
              ))}
            </div>
            <div className="mt-auto rounded-2xl bg-white/5 p-3 text-[11px] text-[#c1bdd8]">
              <p className="font-bold text-white">Besoin d'un coup de main ?</p>
              <p className="mt-1 leading-4">Notre équipe est à Dakar, comme vous.</p>
              <button
                className="mt-3 font-bold text-[#a99fff]"
                data-testid="button-support"
              >
                Parler à l'équipe
              </button>
            </div>
          </aside>
          <main className="min-w-0 flex-1 p-4 sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#8b88a0]">
                  Mercredi 12 juin 2024
                </p>
                <h3 className="mt-1 font-[var(--app-font-serif)] text-xl font-bold tracking-[-.04em] text-[#292541]">
                  Bonjour, Aminata
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#716e84]"
                  data-testid="button-search"
                >
                  {icon(Search01Icon, 17)}
                </button>
                <button
                  className="relative grid h-9 w-9 place-items-center rounded-full bg-white text-[#716e84]"
                  data-testid="button-notifications"
                >
                  {icon(Notification01Icon, 17)}
                  <i className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#ef6d78]" />
                </button>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#dfdbff] text-xs font-bold text-[#5140d4]">
                  AN
                </span>
              </div>
            </div>
            <div className="mt-6 flex gap-2 overflow-auto pb-1">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActive(tab)}
                  data-testid={`button-tab-${tab}`}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold ${active === tab ? "bg-[#5b49e8] text-white" : "bg-white text-[#88859b]"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
              <div className="relative overflow-hidden rounded-[21px] bg-[#5745df] p-6 text-white">
                <div className="relative flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[.13em] text-[#d0caff]">
                    Solde disponible
                  </span>
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    className="rounded-full bg-white/10 p-1.5"
                    data-testid="button-toggle-balance"
                  >
                    {icon(ViewIcon, 16)}
                  </button>
                </div>
                <div className="relative mt-4 font-[var(--app-font-serif)] text-3xl font-bold tracking-[-.06em]">
                  {showBalance ? "107 450" : "•• •••"}{" "}
                  <small className="font-[var(--app-font-sans)] text-sm tracking-normal text-[#d0caff]">
                    FCFA
                  </small>
                </div>
                <Button
                  variant="white"
                  className="relative mt-5 px-4 py-2.5 text-xs"
                  onClick={() => setShowBalance(true)}
                  testId="button-withdraw"
                >
                  {icon(Wallet01Icon, 16)} Retirer mes fonds
                </Button>
                <div className="relative mt-6 grid grid-cols-2 pt-4 text-[11px] text-[#d0caff]">
                  <span>
                    Encaissements en cours
                    <strong className="mt-1 block text-sm text-white">2 115 F</strong>
                  </span>
                  <span className="pl-5">
                    Total ventes générées
                    <strong className="mt-1 block text-sm text-white">114 500 F</strong>
                  </span>
                </div>
              </div>
              <div className="rounded-[21px] bg-white p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#6f6b80]">
                    Performance des ventes
                  </p>
                  <span className="rounded-full bg-[#e9faf3] px-2 py-1 text-[10px] font-bold text-[#2d9b71]">
                    +18.4%
                  </span>
                </div>
                <div className="mt-4 flex items-end gap-2">
                  <strong className="font-[var(--app-font-serif)] text-2xl text-[#292541]">
                    114 500 F
                  </strong>
                  <span className="mb-1 text-[10px] text-[#9491a5]">ce mois</span>
                </div>
                <div className="mt-4 flex h-[92px] items-end gap-2 border-b border-[#eeeef5] px-1">
                  {[31, 48, 38, 57, 46, 70, 62, 85, 75, 100, 88, 94].map((height, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-t-md ${i > 8 ? "bg-[#5b49e8]" : "bg-[#dedbfa]"}`}
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[9px] text-[#aaa7b8]">
                  <span>Mai</span>
                  <span>Juin</span>
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ["Ventes validées", "42", CheckmarkCircle02Icon, "text-[#31a37a]"],
                ["Commandes en cours", "08", Store01Icon, "text-[#5b49e8]"],
                ["Taux de conversion", "7,8%", UserGroupIcon, "text-[#ed8d35]"],
              ].map(([label, value, glyph, color]) => (
                <div className="rounded-[17px] bg-white p-4" key={label as string}>
                  <span className={color as string}>{icon(glyph as IconType, 18)}</span>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#9290a2]">
                    {label as string}
                  </p>
                  <strong className="mt-1 block font-[var(--app-font-serif)] text-xl text-[#292541]">
                    {value as string}
                  </strong>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-[17px] bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#3a3650]">Dernières commandes</p>
                <button
                  className="text-[11px] font-bold text-[#5b49e8]"
                  data-testid="button-view-orders"
                >
                  Voir tout
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[#f1f0f6] pt-3 text-xs">
                <span className="font-bold text-[#3a3650]">CMD-2024-001</span>
                <span className="text-[#9591a5]">2 articles · 16 500 F</span>
                <span className="rounded-full bg-[#e9faf3] px-2 py-1 text-[10px] font-bold text-[#2d9b71]">
                  Livrée
                </span>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [, setLocation] = useLocation();
  const [faq, setFaq] = useState<number | null>(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Auto-scroll testimonials carousel
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    let raf = 0;
    let paused = false;
    const speed = 0.5; // px per frame

    const tick = () => {
      if (!paused && el) {
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 1) {
          el.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          el.scrollLeft += speed;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onEnter = () => { paused = true; };
    const onLeave = () => { paused = false; };
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("touchstart", onEnter, { passive: true });
    el.addEventListener("touchend", onLeave, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("touchstart", onEnter);
      el.removeEventListener("touchend", onLeave);
    };
  }, []);

  const faqs = [
    [
      "Comment Fiaba protège-t-elle mes ventes ?",
      "Chaque commande est suivie de la recommandation à la livraison. Une vente validée déclenche automatiquement votre rémunération. Notre système anti-fraude vérifie chaque transaction.",
    ],
    [
      "Est-ce que je dois avoir une communauté importante ?",
      "Non. Fiaba valorise la confiance et la qualité de votre recommandation, pas seulement le nombre d'abonnés. Un micro-influenceur avec une communauté engagée peut générer plus de ventes qu'un compte avec 100k followers.",
    ],
    [
      "Quand puis-je recevoir mes gains ?",
      "Les gains validés sont disponibles dans votre portefeuille après la période de sécurité de 7 jours. Vous pouvez alors retirer vos fonds vers Wave ou Orange Money en un clic.",
    ],
    [
      "Fiaba est-elle disponible en dehors de Dakar ?",
      "Oui. Fiaba couvre l'ensemble du Sénégal avec des frais de livraison transparents. Nous étendons progressivement notre réseau vers les pays voisins de la CEDEAO.",
    ],
    [
      "Combien coûte Fiaba ?",
      "L'inscription est gratuite pour les vendeurs et les marchands. Fiaba se rémunère via une petite commission sur chaque vente réalisée — vous ne payez que quand vous gagnez.",
    ],
    [
      "Puis-je utiliser Fiaba sans boutique physique ?",
      "Absolument. Que vous soyez une marque établie, un artisan ou un créateur en ligne, Fiaba s'adapte à votre activité. Il suffit de quelques produits pour démarrer.",
    ],
  ];

  const testimonials = [
    {
      quote: "Enfin un outil qui comprend comment on vend vraiment ici. Mes ventes ont triplé en deux mois.",
      name: "Marième Fall",
      role: "Vendeuse à Guédiawaye",
      initials: "MF",
      color: "bg-[#e8c6a7]",
    },
    {
      quote: "On a recruté 40 vendeurs en une semaine. Fiaba a transformé notre réseau en armée commerciale.",
      name: "Cheikh Diop",
      role: "Fondateur, Maison Ndar",
      initials: "CD",
      color: "bg-[#abb9dc]",
    },
    {
      quote: "Je partage un lien, je vois les ventes en temps réel, je retire mes gains sur Wave. Simple et clair.",
      name: "Aminata Ndiaye",
      role: "Vendeuse à Dakar",
      initials: "AN",
      color: "bg-[#d4b8e8]",
    },
    {
      quote: "Avant Fiaba, je vendais dans mon quartier. Aujourd'hui, j'ai des clients à Thiès, Mbour et Saint-Louis.",
      name: "Saliou Kane",
      role: "Vendeur à Thiès",
      initials: "SK",
      color: "bg-[#b8e8c6]",
    },
    {
      quote: "Les analytics m'ont montré quels produits fonctionnent. J'ai ajusté ma stratégie et mon CA a doublé.",
      name: "Ndeye Kébé",
      role: "Vendeuse à Rufisque",
      initials: "NK",
      color: "bg-[#e8c6d4]",
    },
    {
      quote: "Fiaba, c'est la confiance retrouvée. Mes vendeurs savent exactement ce qu'ils gagnent, sans ambiguïté.",
      name: "Ousmane Diop",
      role: "Gérant, Boutique Téranga",
      initials: "OD",
      color: "bg-[#c6d4e8]",
    },
  ];

  const features = [
    [Share02Icon, "Partage en un clic", "Générez un lien unique pour chaque produit. Partagez-le sur WhatsApp, Instagram, TikTok — partout où votre communauté vous écoute.", "text-[#5b49e8]", "bg-[#efedff]"],
    [Wallet01Icon, "Paiements instantanés", "Retirez vos gains sur Wave ou Orange Money. Pas de délai bancaire, pas de paperasse. Votre argent, quand vous le voulez.", "text-[#278e69]", "bg-[#e7faf2]"],
    [Chart02Icon, "Analytics en temps réel", "Suivez clics, conversions et gains en direct. Chaque partage devient une donnée pour optimiser votre stratégie.", "text-[#ac741e]", "bg-[#fff4de]"],
    [ShieldKeyIcon, "Sécurité garantie", "Chaque transaction est protégée. Notre système anti-fraude vérifie les commandes et sécurise vos paiements.", "text-[#c45667]", "bg-[#fff0f1]"],
    [DeliveryTruck01Icon, "Livraison nationale", "Livrez partout au Sénégal avec des frais transparents. Vos clients savent toujours combien ils paient avant de commander.", "text-[#5b49e8]", "bg-[#efedff]"],
    [SmartPhone01Icon, "100% mobile", "Pensé pour le mobile d'abord. Gérez votre boutique, vos campagnes et vos ventes depuis votre téléphone, où que vous soyez.", "text-[#278e69]", "bg-[#e7faf2]"],
  ] as [IconType, string, string, string, string][];

  return (
    <div id="top" className="min-h-[100dvh] bg-[#f8f8fc] text-[#282441]">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-[#e9e7f0] bg-[#f8f8fc]">
        <div className="mx-auto flex h-[76px] max-w-6xl items-center justify-between px-5 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-7 text-[13px] font-bold text-[#716d82] md:flex">
            <a href="#comment" data-testid="link-how">Comment ça marche</a>
            <a href="#features" data-testid="link-features">Fonctionnalités</a>
            <a href="#espace" data-testid="link-space">L'espace Fiaba</a>
            <a href="#temoignages" data-testid="link-stories">Ils en parlent</a>
            <a href="#tarifs" data-testid="link-pricing">Tarifs</a>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <button
              className="px-4 py-2 text-sm font-bold text-[#5d5772]"
              onClick={() => setLocation("/sign-in")}
              data-testid="button-login"
            >
              Se connecter
            </button>
            <Button className="px-4 py-2.5" onClick={() => setLocation("/sign-up")} testId="button-header-start">
              Commencer
            </Button>
          </div>
          <button
            className="rounded-xl p-2 text-[#514b71] md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            data-testid="button-mobile-menu"
          >
            {icon(menuOpen ? Cancel01Icon : Menu01Icon, 22)}
          </button>
        </div>
        {menuOpen && (
          <div className="bg-[#f8f8fc] px-5 pb-5 pt-2 md:hidden">
            <a href="#comment" onClick={() => setMenuOpen(false)} className="block py-3 text-sm font-bold" data-testid="link-mobile-how">Comment ça marche</a>
            <a href="#features" onClick={() => setMenuOpen(false)} className="block py-3 text-sm font-bold" data-testid="link-mobile-features">Fonctionnalités</a>
            <a href="#espace" onClick={() => setMenuOpen(false)} className="block py-3 text-sm font-bold" data-testid="link-mobile-space">L'espace Fiaba</a>
            <a href="#temoignages" onClick={() => setMenuOpen(false)} className="block py-3 text-sm font-bold" data-testid="link-mobile-stories">Ils en parlent</a>
            <a href="#tarifs" onClick={() => setMenuOpen(false)} className="block py-3 text-sm font-bold" data-testid="link-mobile-pricing">Tarifs</a>
            <Button className="mt-2 w-full" onClick={() => setLocation("/sign-up")} testId="button-mobile-start">Commencer</Button>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="fiaba-grid relative overflow-hidden px-5 pb-20 pt-36 lg:pb-28 lg:pt-48">
          <div className="pointer-events-none absolute -right-24 top-20 h-80 w-80 rounded-full bg-[#dcd7ff] blur-2xl" />
          <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.02fr_.98fr]">
            <div className="relative z-10 reveal">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-[11px] font-bold text-[#5e51c9]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#5b49e8]" /> Le commerce avance ensemble
              </div>
              <h1 className="mt-6 max-w-[650px] font-[var(--app-font-serif)] text-[clamp(3.15rem,7vw,6.5rem)] font-bold leading-[.92] tracking-[-.09em] text-[#27223f]">
                Vendez plus.
                <br />
                <span className="text-[#5b49e8]">Ensemble.</span>
              </h1>
              <p className="mt-7 max-w-[500px] text-base leading-7 text-[#706c81] sm:text-lg">
                Fiaba connecte les marques ambitieuses aux personnes qui savent les faire découvrir. Une nouvelle façon de faire circuler les produits au Sénégal.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button onClick={() => setLocation("/sign-up")} testId="button-hero-start">
                  Rejoindre Fiaba {icon(ArrowUpRight01Icon, 17)}
                </Button>
                <a
                  href="#espace"
                  className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-[#625d77] hover:bg-white"
                  data-testid="link-hero-demo"
                >
                  Voir la plateforme{" "}
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[#5b49e8]">
                    {icon(ArrowDown01Icon, 14)}
                  </span>
                </a>
              </div>
              <div className="mt-9 flex items-center gap-3 text-xs text-[#858195]">
                <div className="flex -space-x-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-[#f8f8fc] bg-[#e8c6a7] text-[9px] font-bold">AN</span>
                  <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-[#f8f8fc] bg-[#abb9dc] text-[9px] font-bold">MK</span>
                  <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-[#f8f8fc] bg-[#d4b8e8] text-[9px] font-bold">SK</span>
                  <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-[#f8f8fc] bg-[#b8e8c6] text-[9px] font-bold">OD</span>
                </div>
                <span>Déjà adopté par des équipes à Dakar</span>
              </div>
            </div>
            <div className="relative reveal reveal-delay-2">
              <div className="float rounded-[30px] bg-white/70 p-3 sm:p-5">
                <div className="rounded-[22px] bg-[#f1efff] p-4 sm:p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#5b49e8] text-white">{icon(Store01Icon, 17)}</span>
                      <span className="font-[var(--app-font-serif)] text-sm font-bold">Fiaba</span>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold text-[#8d899d]">Aperçu vendeur</span>
                  </div>
                  <div className="rounded-[18px] bg-[#5b49e8] p-5 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#d2ccff]">Gains ce mois-ci</p>
                    <strong className="mt-3 block font-[var(--app-font-serif)] text-3xl tracking-[-.06em]">
                      68 250{" "}
                      <small className="font-[var(--app-font-sans)] text-xs tracking-normal">FCFA</small>
                    </strong>
                    <div className="mt-5 flex items-end gap-1">
                      {[24, 33, 28, 44, 39, 52, 48, 64, 57, 76, 70, 88].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t-sm bg-white/30" style={{ height: `${h / 2}px` }} />
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white p-4">
                      <span className="text-[#5b49e8]">{icon(Chart02Icon, 18)}</span>
                      <p className="mt-3 text-[10px] text-[#9b98aa]">Ventes validées</p>
                      <strong className="mt-1 block text-lg">24</strong>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <span className="text-[#32a17a]">{icon(Wallet01Icon, 18)}</span>
                      <p className="mt-3 text-[10px] text-[#9b98aa]">À retirer</p>
                      <strong className="mt-1 block text-lg">12 500 F</strong>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 rounded-2xl bg-white p-3 sm:-left-9">
                <div className="flex items-center gap-2 text-xs font-bold text-[#3f3a59]">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#e7f9f1] text-[#2d9e72]">{icon(CheckmarkCircle02Icon, 16)}</span>
                  Vente validée <span className="text-[#2d9e72]">+4 500 F</span>
                </div>
              </div>
              <div className="absolute -right-3 top-8 rounded-2xl bg-white p-3 sm:-right-6">
                <div className="flex items-center gap-2 text-xs font-bold text-[#3f3a59]">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#fff4de] text-[#ac741e]">{icon(Fire02Icon, 16)}</span>
                  <span className="text-[#ac741e]">Tendance</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats bar */}
        <section className="bg-[#5b49e8] px-5 py-8 text-white">
          <div className="mx-auto grid max-w-6xl gap-5 text-center sm:grid-cols-4 sm:text-left">
            <div>
              <strong className="font-[var(--app-font-serif)] text-2xl">1 200+</strong>
              <p className="mt-1 text-xs text-[#d5cfff]">vendeurs en mouvement</p>
            </div>
            <div>
              <strong className="font-[var(--app-font-serif)] text-2xl">86M F</strong>
              <p className="mt-1 text-xs text-[#d5cfff]">de ventes accompagnées</p>
            </div>
            <div>
              <strong className="font-[var(--app-font-serif)] text-2xl">14 régions</strong>
              <p className="mt-1 text-xs text-[#d5cfff]">couvertes au Sénégal</p>
            </div>
            <div>
              <strong className="font-[var(--app-font-serif)] text-2xl">7 jours</strong>
              <p className="mt-1 text-xs text-[#d5cfff]">pour recevoir vos gains</p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="comment" className="px-5 py-24 lg:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#5b49e8]">Le modèle Fiaba</p>
              <h2 className="mt-4 font-[var(--app-font-serif)] text-4xl font-bold leading-tight tracking-[-.06em] sm:text-5xl">
                Une bonne recommandation peut changer une journée.
              </h2>
              <p className="mt-5 leading-7 text-[#77738a]">
                Fiaba rend cette valeur visible, mesurable et rémunérée. Pour les marques comme pour celles et ceux qui les font vivre.
              </p>
            </div>
            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {[
                [Store01Icon, "01", "Le marchand équipe", "Déposez vos produits, fixez votre commission et lancez une campagne qui a du sens."],
                [UserGroupIcon, "02", "Le vendeur choisit", "Découvrez des offres faites pour votre audience et partagez-les avec vos mots."],
                [CheckmarkCircle02Icon, "03", "La vente circule", "Fiaba suit chaque étape. Une vente livrée, une rémunération claire."],
              ].map(([glyph, num, title, text]: [IconType, string, string, string]) => (
                <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-b from-[#f6f5ff] to-white p-7" key={num}>
                  <div className="pointer-events-none absolute -right-6 -top-8 font-[var(--app-font-serif)] text-[120px] font-bold leading-none text-[#5b49e8]/[.04]">{num}</div>
                  <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-[#5b49e8] text-white">{icon(glyph, 22, 2)}</span>
                  <span className="relative mt-6 inline-block rounded-full bg-[#5b49e8]/10 px-3 py-1 text-[11px] font-bold text-[#5b49e8]">Étape {num}</span>
                  <h3 className="relative mt-4 font-[var(--app-font-serif)] text-xl font-bold tracking-[-.04em] text-[#211c42]">{title}</h3>
                  <p className="relative mt-3 text-sm leading-6 text-[#77738a]">{text}</p>
                  <span className="relative mt-6 flex items-center gap-1.5 text-xs font-bold text-[#5b49e8]">Découvrir {icon(ArrowUpRight01Icon, 14)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Dashboard preview */}
        <section id="espace" className="bg-[#f0effa] px-5 py-24 lg:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-[#5b49e8]">L'espace Fiaba</p>
                <h2 className="mt-4 max-w-2xl font-[var(--app-font-serif)] text-4xl font-bold tracking-[-.06em] sm:text-5xl">
                  Tout ce qu'il faut pour garder une longueur d'avance.
                </h2>
              </div>
              <p className="max-w-xs text-sm leading-6 text-[#77738a]">
                Un espace simple pour piloter vos campagnes, vos ventes et votre croissance au quotidien.
              </p>
            </div>
            <DashboardPreview />
          </div>
        </section>

        {/* Features grid */}
        <section id="features" className="px-5 py-24 lg:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#5b49e8]">Fonctionnalités</p>
              <h2 className="mt-4 font-[var(--app-font-serif)] text-4xl font-bold leading-tight tracking-[-.06em] sm:text-5xl">
                Pensé pour vendre. Conçu pour durer.
              </h2>
              <p className="mt-5 leading-7 text-[#77738a]">
                Chaque fonctionnalité répond à un besoin réel du commerce sénégalais. Rien de superflu, tout l'essentiel.
              </p>
            </div>
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(([glyph, title, text, color, bg]) => (
                <div key={title} className="rounded-[24px] bg-white p-7 transition hover:-translate-y-1">
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl ${bg} ${color}`}>{icon(glyph, 22, 2)}</span>
                  <h3 className="mt-5 font-[var(--app-font-serif)] text-lg font-bold tracking-[-.03em] text-[#211c42]">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#77738a]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* For merchants */}
        <section className="px-5 py-24 lg:py-32">
          <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#5b49e8]">Pour les marques</p>
              <h2 className="mt-4 font-[var(--app-font-serif)] text-4xl font-bold leading-tight tracking-[-.06em] sm:text-5xl">
                Vos produits méritent plus qu'un simple post.
              </h2>
              <p className="mt-5 leading-7 text-[#77738a]">
                Transformez votre réseau en force commerciale. Vous gardez le contrôle, vos vendeurs gardent leur voix.
              </p>
              <Button className="mt-7" variant="soft" onClick={() => setLocation("/sign-up")} testId="button-merchant-start">
                Lancer une campagne {icon(ArrowUpRight01Icon, 17)}
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[23px] bg-[#e8e4ff] p-6 sm:translate-y-7">
                <span className="text-[#5b49e8]">{icon(UserGroupIcon, 23)}</span>
                <h3 className="mt-14 font-[var(--app-font-serif)] text-xl font-bold">Le bon réseau, au bon moment</h3>
                <p className="mt-2 text-sm leading-6 text-[#6f6a83]">Trouvez les profils qui parlent déjà à vos futurs clients.</p>
              </div>
              <div className="rounded-[23px] bg-[#e5f8f1] p-6">
                <span className="text-[#2d9a70]">{icon(Chart02Icon, 23)}</span>
                <h3 className="mt-14 font-[var(--app-font-serif)] text-xl font-bold">Des chiffres qui racontent</h3>
                <p className="mt-2 text-sm leading-6 text-[#6f6a83]">Chaque partage devient une donnée utile pour grandir.</p>
              </div>
            </div>
          </div>
        </section>

        {/* For sellers */}
        <section className="bg-[#f0effa] px-5 py-24 lg:py-32">
          <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.2fr_.8fr]">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[23px] bg-white p-6">
                <span className="text-[#5b49e8]">{icon(Share02Icon, 23)}</span>
                <h3 className="mt-14 font-[var(--app-font-serif)] text-xl font-bold">Partagez avec vos mots</h3>
                <p className="mt-2 text-sm leading-6 text-[#6f6a83]">Recommandez des produits que vous aimez, pas des pubs que vous subissez.</p>
              </div>
              <div className="rounded-[23px] bg-[#fff4de] p-6 sm:translate-y-7">
                <span className="text-[#ac741e]">{icon(Wallet01Icon, 23)}</span>
                <h3 className="mt-14 font-[var(--app-font-serif)] text-xl font-bold">Gagnez à chaque vente</h3>
                <p className="mt-2 text-sm leading-6 text-[#6f6a83]">Une commission claire sur chaque commande livrée. Sans surprise.</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#5b49e8]">Pour les vendeurs</p>
              <h2 className="mt-4 font-[var(--app-font-serif)] text-4xl font-bold leading-tight tracking-[-.06em] sm:text-5xl">
                Votre voix vaut de l'or.
              </h2>
              <p className="mt-5 leading-7 text-[#77738a]">
                Vous recommandez déjà des produits à vos proches. Fiaba vous rémunère pour le faire, avec transparence et simplicité.
              </p>
              <Button className="mt-7" variant="soft" onClick={() => setLocation("/sign-up")} testId="button-seller-start">
                Devenir vendeur {icon(ArrowUpRight01Icon, 17)}
              </Button>
            </div>
          </div>
        </section>

        {/* Testimonials carousel */}
        <section id="temoignages" className="bg-[#242046] py-24 text-white lg:py-32">
          <div className="mx-auto max-w-6xl px-5">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#a9a0ff]">Paroles du réseau</p>
              <h2 className="mt-4 mx-auto max-w-2xl font-[var(--app-font-serif)] text-4xl font-bold tracking-[-.06em] sm:text-5xl">
                Le commerce, quand il redevient humain.
              </h2>
            </div>
          </div>
          {/* Carousel with edge blur */}
          <div className="relative mt-16">
            {/* Left blur */}
            <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-[#242046] to-transparent sm:w-32" />
            {/* Right blur */}
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-[#242046] to-transparent sm:w-32" />
            {/* Scrollable track */}
            <div
              ref={carouselRef}
              className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-5 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              data-testid="testimonial-carousel"
            >
              {testimonials.map((t) => (
                <div
                  key={t.name}
                  className="w-[300px] shrink-0 snap-center rounded-[24px] bg-white/5 p-7 backdrop-blur-sm transition hover:bg-white/10 sm:w-[360px]"
                >
                  <div className="flex items-center gap-3">
                    <span className={`grid h-12 w-12 place-items-center rounded-full ${t.color} text-sm font-bold text-[#242046]`}>{t.initials}</span>
                    <div>
                      <p className="font-bold">{t.name}</p>
                      <p className="text-xs text-[#9992c2]">{t.role}</p>
                    </div>
                  </div>
                  <p className="mt-5 text-sm leading-6 text-[#dcd8ff]">"{t.quote}"</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="tarifs" className="px-5 py-24 lg:py-32">
          <div className="mx-auto max-w-5xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#5b49e8]">Tarifs</p>
              <h2 className="mt-4 font-[var(--app-font-serif)] text-4xl font-bold leading-tight tracking-[-.06em] sm:text-5xl">
                Simple. Vous ne payez que quand vous gagnez.
              </h2>
              <p className="mt-5 leading-7 text-[#77738a]">
                Pas d'abonnement caché. Pas de frais d'installation. Fiaba se rémunère uniquement quand une vente est réalisée.
              </p>
            </div>
            <div className="mt-16 grid gap-6 md:grid-cols-2">
              {/* Vendeur plan */}
              <div className="rounded-[28px] bg-white p-8">
                <div className="flex items-center gap-2">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]">{icon(Share02Icon, 20, 2)}</span>
                  <h3 className="font-[var(--app-font-serif)] text-xl font-bold">Vendeur</h3>
                </div>
                <div className="mt-6 flex items-end gap-1">
                  <span className="font-[var(--app-font-serif)] text-5xl font-bold tracking-[-.06em] text-[#211c42]">Gratuit</span>
                </div>
                <p className="mt-2 text-sm text-[#77738a]">Inscription sans frais. Vous touchez votre commission à chaque vente.</p>
                <ul className="mt-6 space-y-3 text-sm text-[#4a4660]">
                  {["Accès aux campagnes des marques", "Liens de partage illimités", "Suivi des ventes en temps réel", "Retrait sur Wave & Orange Money", "Commission de 5 à 15% par vente"].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#e7faf2] text-[#278e69]">{icon(CheckmarkCircle02Icon, 13)}</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="mt-8 w-full" variant="soft" onClick={() => setLocation("/sign-up")} testId="button-plan-seller">
                  Devenir vendeur {icon(ArrowUpRight01Icon, 16)}
                </Button>
              </div>

              {/* Marchand plan */}
              <div className="relative rounded-[28px] bg-gradient-to-b from-[#f6f5ff] to-white p-8">
                <div className="absolute -top-3 right-6 rounded-full bg-[#5b49e8] px-3 py-1 text-[10px] font-bold text-white">Populaire</div>
                <div className="flex items-center gap-2">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#5b49e8] text-white">{icon(Store01Icon, 20, 2)}</span>
                  <h3 className="font-[var(--app-font-serif)] text-xl font-bold">Marchand</h3>
                </div>
                <div className="mt-6 flex items-end gap-1">
                  <span className="font-[var(--app-font-serif)] text-5xl font-bold tracking-[-.06em] text-[#211c42]">5%</span>
                  <span className="mb-2 text-sm text-[#77738a]">par vente</span>
                </div>
                <p className="mt-2 text-sm text-[#77738a]">Sans abonnement. Vous payez uniquement quand une vente est livrée.</p>
                <ul className="mt-6 space-y-3 text-sm text-[#4a4660]">
                  {["Catalogue de produits illimité", "Campagnes illimitées", "Gestion des vendeurs et invitations", "Analytics avancées", "Zones de livraison personnalisables", "Support prioritaire à Dakar"].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#e7faf2] text-[#278e69]">{icon(CheckmarkCircle02Icon, 13)}</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="mt-8 w-full" onClick={() => setLocation("/sign-up")} testId="button-plan-merchant">
                  Lancer ma boutique {icon(ArrowUpRight01Icon, 16)}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-5 py-24 lg:py-32">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#5b49e8]">Questions utiles</p>
              <h2 className="mt-4 font-[var(--app-font-serif)] text-4xl font-bold tracking-[-.06em]">
                On vous explique tout.
              </h2>
            </div>
            <div className="mt-10 divide-y divide-[#e7e5ee] border-y border-[#e7e5ee]">
              {faqs.map(([question, answer], i) => (
                <div key={question}>
                  <button
                    onClick={() => setFaq(faq === i ? null : i)}
                    className="flex w-full items-center justify-between py-5 text-left font-bold"
                    data-testid={`button-faq-${i}`}
                  >
                    <span>{question}</span>
                    <span className={`text-[#5b49e8] transition ${faq === i ? "rotate-180" : ""}`}>
                      {icon(ArrowDown01Icon, 18)}
                    </span>
                  </button>
                  {faq === i && (
                    <p className="max-w-2xl pb-5 pr-8 text-sm leading-6 text-[#77738a]">{answer}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-10 rounded-[24px] bg-[#f0effa] p-6 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#5b49e8] text-white mx-auto">{icon(HeadphonesIcon, 22, 2)}</span>
              <p className="mt-4 font-[var(--app-font-serif)] text-lg font-bold text-[#211c42]">Une autre question ?</p>
              <p className="mt-2 text-sm text-[#77738a]">Notre équipe à Dakar vous répond en moins de 24h.</p>
              <Button className="mt-5" variant="soft" onClick={() => setLocation("/sign-up")} testId="button-faq-contact">
                Contacter l'équipe {icon(ArrowUpRight01Icon, 16)}
              </Button>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-5 pb-24">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[28px] bg-[#5b49e8] px-6 py-14 text-center text-white sm:px-12">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#d5cfff]">À vous de jouer</p>
            <h2 className="mx-auto mt-4 max-w-2xl font-[var(--app-font-serif)] text-4xl font-bold tracking-[-.07em] sm:text-6xl">
              La prochaine vente commence peut-être par vous.
            </h2>
            <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-[#d5cfff]">
              Rejoignez les marques et vendeurs qui transforment déjà leur réseau en résultats.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button variant="white" onClick={() => setLocation("/sign-up")} testId="button-final-start">
                Commencer avec Fiaba {icon(ArrowUpRight01Icon, 17)}
              </Button>
              <a
                href="#comment"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"
                data-testid="link-final-how"
              >
                Comment ça marche
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e8e6ef] bg-[#f8f8fc] px-5 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
            {/* Brand + newsletter */}
            <div>
              <Logo />
              <p className="mt-4 max-w-xs text-sm leading-6 text-[#77738a]">
                La plateforme qui transforme le bouche-à-oreille en commerce. Pensé à Dakar, construit pour aller loin.
              </p>
              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-wider text-[#9290a2]">Newsletter</p>
                <form className="mt-3 flex gap-2" onSubmit={(e) => e.preventDefault()}>
                  <input
                    type="email"
                    placeholder="votre@email.sn"
                    className="flex-1 rounded-full border border-[#e0dde8] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#5b49e8]"
                    data-testid="input-newsletter"
                  />
                  <Button type="submit" className="shrink-0 px-4 py-2.5" testId="button-newsletter">
                    {icon(Mail01Icon, 16)}
                  </Button>
                </form>
              </div>
            </div>
            {/* Product links */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#9290a2]">Produit</p>
              <ul className="mt-4 space-y-3 text-sm text-[#77738a]">
                <li><a href="#comment" className="hover:text-[#5b49e8]">Comment ça marche</a></li>
                <li><a href="#features" className="hover:text-[#5b49e8]">Fonctionnalités</a></li>
                <li><a href="#espace" className="hover:text-[#5b49e8]">L'espace Fiaba</a></li>
                <li><a href="#tarifs" className="hover:text-[#5b49e8]">Tarifs</a></li>
              </ul>
            </div>
            {/* Company links */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#9290a2]">Entreprise</p>
              <ul className="mt-4 space-y-3 text-sm text-[#77738a]">
                <li><a href="#temoignages" className="hover:text-[#5b49e8]">Témoignages</a></li>
                <li><a href="#" className="hover:text-[#5b49e8]">À propos</a></li>
                <li><a href="#" className="hover:text-[#5b49e8]">Blog</a></li>
                <li><a href="#" className="hover:text-[#5b49e8]">Carrières</a></li>
              </ul>
            </div>
            {/* Support links */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#9290a2]">Support</p>
              <ul className="mt-4 space-y-3 text-sm text-[#77738a]">
                <li><a href="#" className="hover:text-[#5b49e8]">Centre d'aide</a></li>
                <li><a href="#" className="hover:text-[#5b49e8]">Nous contacter</a></li>
                <li><a href="#" className="hover:text-[#5b49e8]">Conditions d'utilisation</a></li>
                <li><a href="#" className="hover:text-[#5b49e8]">Confidentialité</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-[#e8e6ef] pt-6 sm:flex-row">
            <p className="text-xs text-[#8a8799]">Pensé à Dakar. Construit pour aller loin.</p>
            <div className="flex items-center gap-2 text-xs text-[#8a8799]">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[#efedff] text-[#5b49e8]">{icon(MapPinIcon, 12)}</span>
              Dakar, Sénégal
            </div>
            <p className="text-xs font-bold text-[#77738a]">© 2024 Fiaba</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/merchant/*?" component={MerchantRouter} />
        <Route path="/seller/*?" component={SellerRouter} />
        <Route path="/admin/*?" component={AdminRouter} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
