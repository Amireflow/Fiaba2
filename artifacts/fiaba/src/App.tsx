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
  InstagramIcon,
  LockKeyIcon,
  Mail01Icon,
  MapPinIcon,
  Menu02Icon,
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
  TiktokIcon,
  Timer01Icon,
  UserGroupIcon,
  ViewIcon,
  Wallet01Icon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Icon, type IconType } from "@/components/shared/icon";
import { haptic } from "@/lib/utils";
import NotFound from "@/pages/not-found";
import { AdminRouter } from "@/features/admin/admin-router";
import { MerchantRouter } from "@/features/merchant/merchant-router";
import { SellerRouter } from "@/features/seller/seller-router";
import { Checkout } from "@/features/shop/pages/checkout";
import { ProductLinkRedirect } from "@/features/shop/pages/product-link-redirect";
import { Onboarding } from "@/features/merchant/pages/onboarding";
import { SellerOnboarding } from "@/features/seller/pages/onboarding";
import { SignInPage, SignUpPage } from "@/pages/auth";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { Route, Switch, useLocation, Router as WouterRouter } from "wouter";
import { AuthProvider, useAuth } from "@/hooks/use-auth";

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
      onClick={() => { haptic('light'); onClick?.(); }}
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
                <span className="text-[#9591a5]">2 articles, 16 500 F</span>
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

function EarningsSimulator() {
  const [followers, setFollowers] = useState(10000);
  const [platform, setPlatform] = useState<"instagram" | "tiktok" | "whatsapp">("instagram");
  const [engagement, setEngagement] = useState(5); // %

  // Engagement rates by platform (baseline)
  const platformEngagement = { instagram: 1, tiktok: 1.5, whatsapp: 8 };
  const platformConversion = { instagram: 1.2, tiktok: 1.8, whatsapp: 3.5 }; // % of reach that converts
  const avgOrderValue = 15000; // FCFA
  const commissionRate = 0.10; // 10% average

  const effEngagement = (engagement / 100) * platformEngagement[platform];
  const reach = followers * effEngagement;
  const conversions = Math.round(reach * (platformConversion[platform] / 100));
  const monthlyEarnings = Math.round(conversions * avgOrderValue * commissionRate);

  const platforms = [
    { id: "instagram" as const, label: "Instagram", glyph: InstagramIcon, color: "#e1306c", bg: "bg-[#fff0f4]" },
    { id: "tiktok" as const, label: "TikTok", glyph: TiktokIcon, color: "#000", bg: "bg-[#f0f0f0]" },
    { id: "whatsapp" as const, label: "WhatsApp", glyph: WhatsappIcon, color: "#25d366", bg: "bg-[#e7faf2]" },
  ];

  const tiers = [
    { range: "0 - 1K", label: "Nano", desc: "Commencez à partager" },
    { range: "1K - 10K", label: "Micro", desc: "Audience engagée" },
    { range: "10K - 100K", label: "Mid", desc: "Influence établie" },
    { range: "100K+", label: "Macro", desc: "Créateur pro" },
  ];

  const currentTier = followers < 1000 ? 0 : followers < 10000 ? 1 : followers < 100000 ? 2 : 3;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_4px_24px_rgba(36,32,70,.08)]">
        <div className="grid lg:grid-cols-[1.1fr_.9fr]">
          {/* Left: Controls */}
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#5b49e8] text-white">{icon(Chart02Icon, 20, 2)}</span>
              <div>
                <h3 className="font-[var(--app-font-serif)] text-lg font-bold text-[#211c42]">Simulateur de gains</h3>
                <p className="text-xs text-[#9290a2]">Estimez vos revenus mensuels</p>
              </div>
            </div>

            {/* Platform selector */}
            <p className="mt-6 text-xs font-bold uppercase tracking-wider text-[#9290a2]">Réseau principal</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 transition ${platform === p.id ? "border-[#5b49e8] bg-[#f5f3ff]" : "border-[#eeeef5] hover:border-[#d8d4f7]"}`}
                  data-testid={`button-sim-platform-${p.id}`}
                >
                  <span className={`grid h-9 w-9 place-items-center rounded-xl ${p.bg}`} style={{ color: p.color }}>
                    {icon(p.glyph, 18)}
                  </span>
                  <span className="text-[11px] font-bold text-[#4a4660]">{p.label}</span>
                </button>
              ))}
            </div>

            {/* Followers slider */}
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-[#9290a2]">Abonnés</p>
                <span className="font-[var(--app-font-serif)] text-lg font-bold text-[#292541]">{followers.toLocaleString("fr-FR")}</span>
              </div>
              <input
                type="range"
                min={0}
                max={10000000}
                step={1000}
                value={followers}
                onChange={(e) => setFollowers(Number(e.target.value))}
                style={{ ["--range-fill" as string]: `${(followers / 10000000) * 100}%` }}
                className="fiaba-range mt-3 w-full"
                data-testid="input-sim-followers"
              />
              <div className="mt-1.5 flex justify-between text-[10px] text-[#aaa7b8]">
                <span>0</span>
                <span>2.5M</span>
                <span>5M</span>
                <span>7.5M</span>
                <span>10M</span>
              </div>
            </div>

            {/* Engagement slider */}
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-[#9290a2]">Taux d'engagement</p>
                <span className="font-[var(--app-font-serif)] text-lg font-bold text-[#292541]">{engagement}%</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={engagement}
                onChange={(e) => setEngagement(Number(e.target.value))}
                style={{ ["--range-fill" as string]: `${((engagement - 1) / 19) * 100}%` }}
                className="fiaba-range mt-3 w-full"
                data-testid="input-sim-engagement"
              />
              <div className="mt-1.5 flex justify-between text-[10px] text-[#aaa7b8]">
                <span>1%</span>
                <span>10%</span>
                <span>20%</span>
              </div>
            </div>

            {/* Tier indicator */}
            <div className="mt-6 flex items-center gap-2">
              {tiers.map((t, i) => (
                <div key={t.label} className="flex-1">
                  <div className={`h-1.5 rounded-full transition ${i <= currentTier ? "bg-[#5b49e8]" : "bg-[#eeeef5]"}`} />
                  <p className={`mt-1.5 text-[10px] font-bold ${i === currentTier ? "text-[#5b49e8]" : "text-[#aaa7b8]"}`}>{t.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Results */}
          <div className="relative flex flex-col justify-center bg-gradient-to-br from-[#5745df] to-[#4e3bd5] p-6 text-white sm:p-8">
            <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <p className="relative text-[11px] font-bold uppercase tracking-[.16em] text-[#d0caff]">Estimation mensuelle</p>
            <div className="relative mt-3">
              <strong className="font-[var(--app-font-serif)] text-[clamp(2.5rem,8vw,4rem)] font-bold leading-none tracking-[-.06em]">
                {monthlyEarnings.toLocaleString("fr-FR")}
              </strong>
              <span className="ml-2 text-sm text-[#d0caff]">FCFA / mois</span>
            </div>

            <div className="relative mt-6 space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-white/10 p-3.5 backdrop-blur-sm">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15">{icon(UserGroupIcon, 16)}</span>
                  <span className="text-xs text-[#d0caff]">Portée estimée</span>
                </div>
                <strong className="font-[var(--app-font-serif)] text-base">{Math.round(reach).toLocaleString("fr-FR")} personnes</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/10 p-3.5 backdrop-blur-sm">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15">{icon(ShoppingBag01Icon, 16)}</span>
                  <span className="text-xs text-[#d0caff]">Ventes estimées</span>
                </div>
                <strong className="font-[var(--app-font-serif)] text-base">{conversions} commandes</strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/10 p-3.5 backdrop-blur-sm">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15">{icon(Wallet01Icon, 16)}</span>
                  <span className="text-xs text-[#d0caff]">Commission moyenne</span>
                </div>
                <strong className="font-[var(--app-font-serif)] text-base">10% / vente</strong>
              </div>
            </div>

            <p className="relative mt-5 text-[10px] leading-4 text-[#c5c0f0]">
              Estimation indicative basée sur une commande moyenne de 15 000 FCFA et un taux de commission de 10%. Les résultats réels dépendent de votre contenu et de votre audience.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Home() {
  const { session, profile } = useAuth();
  const isLoggedIn = !!session;
  const dashboardPath = profile?.role === 'marchand' ? '/merchant' : profile?.role === 'admin' ? '/admin' : profile?.role === 'vendeur' ? '/seller' : '/onboarding';
  const dashboardLabel = profile?.role === 'marchand' ? 'Espace Boutique' : profile?.role === 'admin' ? 'Espace Admin' : profile?.role === 'vendeur' ? 'Espace Vendeur' : 'Mon Espace';

  const [menuOpen, setMenuOpen] = useState(false);
  const [, setLocation] = useLocation();
  const [faq, setFaq] = useState<number | null>(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const creatorRef = useRef<HTMLDivElement>(null);

  // Auto-scroll testimonials carousel (infinite loop)
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    let raf = 0;
    let paused = false;
    const speed = 1.5;
    // Content is duplicated; half is the original set width
    const half = () => el.scrollWidth / 2;

    const tick = () => {
      if (!paused && el) {
        el.scrollLeft += speed;
        // When we've scrolled past the first set, jump back seamlessly
        if (el.scrollLeft >= half()) {
          el.scrollLeft -= half();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    // Start at 0
    el.scrollLeft = 0;
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

  // Auto-scroll creator carousel (infinite loop)
  useEffect(() => {
    const el = creatorRef.current;
    if (!el) return;
    let raf = 0;
    let paused = false;
    const speed = 1.2;
    const half = () => el.scrollWidth / 2;

    const tick = () => {
      if (!paused && el) {
        el.scrollLeft += speed;
        if (el.scrollLeft >= half()) {
          el.scrollLeft -= half();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    el.scrollLeft = 0;
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

  const creatorCards = [
    { img: "influencer-1.jpg", name: "Aminata N.", niche: "Lifestyle à Dakar", followers: "8 200", earnings: "180 000 F" },
    { img: "influencer-2.jpg", name: "Saliou K.", niche: "Tech & gaming à Thiès", followers: "15 400", earnings: "245 000 F" },
    { img: "influencer-3.jpg", name: "Ndeye K.", niche: "Mode à Rufisque", followers: "5 800", earnings: "132 000 F" },
    { img: "influencer-4.jpg", name: "Fatou D.", niche: "Beauté à Dakar", followers: "22 300", earnings: "310 000 F" },
    { img: "influencer-1.jpg", name: "Awa S.", niche: "Food à Mbour", followers: "6 100", earnings: "98 000 F" },
    { img: "influencer-3.jpg", name: "Khadija M.", niche: "Mode à Saint Louis", followers: "11 700", earnings: "198 000 F" },
  ];

  const faqs = [
    [
      "Comment Fiaba protège-t-elle mes ventes ?",
      "Chaque commande est suivie de la recommandation à la livraison. Une vente validée déclenche automatiquement votre rémunération. Notre système de protection vérifie chaque transaction en temps réel.",
    ],
    [
      "Est-ce que je dois avoir une communauté importante ?",
      "Non. Fiaba valorise la confiance et la qualité de votre recommandation, pas seulement le nombre d'abonnés. Un petit créateur avec une communauté engagée peut générer plus de ventes qu'un compte avec 100k followers.",
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
      "L'inscription est gratuite pour les vendeurs et les marchands. Fiaba se rémunère via une petite commission sur chaque vente réalisée. Vous ne payez que quand vous gagnez.",
    ],
    [
      "Puis-je utiliser Fiaba sans boutique physique ?",
      "Absolument. Que vous soyez une marque établie, un artisan ou un créateur en ligne, Fiaba s'adapte à votre activité. Il suffit de quelques produits pour démarrer.",
    ],
  ];

  const testimonials = [
    {
      quote: "J'ai 8 000 abonnés sur TikTok. Avec Fiaba, j'ai gagné 180 000 F le premier mois. C'est devenu mon métier.",
      name: "Marième Fall",
      role: "Créatrice de contenu, 8K abonnés TikTok",
      initials: "MF",
      color: "bg-[#e8c6a7]",
    },
    {
      quote: "On a recruté 40 influenceurs en une semaine. Fiaba a transformé notre réseau en armée commerciale.",
      name: "Cheikh Diop",
      role: "Fondateur, Maison Ndar",
      initials: "CD",
      color: "bg-[#abb9dc]",
    },
    {
      quote: "Je partage un lien sur mon statut WhatsApp, je vois les ventes en temps réel, je retire sur Wave. Simple.",
      name: "Aminata Ndiaye",
      role: "Petite influenceuse à Dakar",
      initials: "AN",
      color: "bg-[#d4b8e8]",
    },
    {
      quote: "Avant Fiaba, je postais pour le fun. Aujourd'hui, mes stories rapportent plus qu'un salaire.",
      name: "Saliou Kane",
      role: "Créateur lifestyle, 15K abonnés",
      initials: "SK",
      color: "bg-[#b8e8c6]",
    },
    {
      quote: "Les analytics m'ont montré quels produits marchent avec mon audience. J'ai ajusté et mes gains ont doublé.",
      name: "Ndeye Kébé",
      role: "Influenceuse mode à Rufisque",
      initials: "NK",
      color: "bg-[#e8c6d4]",
    },
    {
      quote: "Fiaba, c'est la confiance retrouvée. Chaque créateur sait exactement ce qu'il gagne, sans ambiguïté.",
      name: "Ousmane Diop",
      role: "Gérant, Boutique Téranga",
      initials: "OD",
      color: "bg-[#c6d4e8]",
    },
  ];

  const features = [
    [Share02Icon, "Partage en un clic", "Générez un lien unique pour chaque produit. Partagez le sur WhatsApp, Instagram, TikTok, partout où votre communauté vous écoute.", "text-[#5b49e8]", "bg-[#efedff]"],
    [Wallet01Icon, "Paiements instantanés", "Retirez vos gains sur Wave ou Orange Money. Pas de délai bancaire, pas de paperasse. Votre argent, quand vous le voulez.", "text-[#278e69]", "bg-[#e7faf2]"],
    [Chart02Icon, "Analytics en temps réel", "Suivez clics, conversions et gains en direct. Chaque partage devient une donnée pour optimiser votre stratégie.", "text-[#ac741e]", "bg-[#fff4de]"],
    [ShieldKeyIcon, "Sécurité garantie", "Chaque transaction est protégée. Notre système de protection vérifie les commandes et sécurise vos paiements.", "text-[#c45667]", "bg-[#fff0f1]"],
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
            <a href="#espace" data-testid="link-space">La plateforme</a>
            <a href="#temoignages" data-testid="link-stories">Créateurs</a>
            <a href="#tarifs" data-testid="link-pricing">Tarifs</a>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            {isLoggedIn ? (
              <Button
                className="px-4 py-2.5 flex items-center gap-2 bg-[#5b49e8] text-white shadow-md hover:bg-[#4e3bd5]"
                onClick={() => setLocation(dashboardPath)}
                testId="button-header-dashboard"
              >
                {dashboardLabel} {icon(ArrowUpRight01Icon, 16)}
              </Button>
            ) : (
              <>
                <button
                  className="rounded-full bg-[#f0eff5] px-4 py-2 text-xs font-bold text-[#443e62] hover:bg-[#e4e1ff] hover:text-[#5b49e8] transition"
                  onClick={() => { haptic('light'); setLocation("/sign-in"); }}
                  data-testid="button-login"
                >
                  Connexion
                </button>
                <Button className="px-4 py-2.5" onClick={() => setLocation("/sign-up")} testId="button-header-start">
                  Devenir créateur
                </Button>
              </>
            )}
          </div>
          <button
            className="rounded-xl p-2 text-[#514b71] md:hidden"
            onClick={() => { haptic('light'); setMenuOpen(!menuOpen); }}
            data-testid="button-mobile-menu"
          >
            {icon(menuOpen ? Cancel01Icon : Menu02Icon, 22)}
          </button>
        </div>
        {menuOpen && (
          <div className="bg-[#f8f8fc] px-5 pb-5 pt-2 md:hidden">
            <a href="#comment" onClick={() => { haptic('light'); setMenuOpen(false); }} className="block py-3 text-sm font-bold" data-testid="link-mobile-how">Comment ça marche</a>
            <a href="#features" onClick={() => { haptic('light'); setMenuOpen(false); }} className="block py-3 text-sm font-bold" data-testid="link-mobile-features">Fonctionnalités</a>
            <a href="#espace" onClick={() => { haptic('light'); setMenuOpen(false); }} className="block py-3 text-sm font-bold" data-testid="link-mobile-space">La plateforme</a>
            <a href="#temoignages" onClick={() => { haptic('light'); setMenuOpen(false); }} className="block py-3 text-sm font-bold" data-testid="link-mobile-stories">Créateurs</a>
            <a href="#tarifs" onClick={() => { haptic('light'); setMenuOpen(false); }} className="block py-3 text-sm font-bold" data-testid="link-mobile-pricing">Tarifs</a>
            {isLoggedIn ? (
              <Button className="mt-2 w-full" onClick={() => setLocation(dashboardPath)} testId="button-mobile-dashboard">
                Accéder à mon {dashboardLabel}
              </Button>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                <button
                  className="w-full rounded-full bg-[#f0eff5] py-2.5 text-xs font-bold text-[#443e62] hover:bg-[#e4e1ff] hover:text-[#5b49e8] transition"
                  onClick={() => { haptic('light'); setLocation("/sign-in"); }}
                  data-testid="button-mobile-login"
                >
                  Connexion
                </button>
                <Button className="w-full py-2.5" onClick={() => setLocation("/sign-up")} testId="button-mobile-start">
                  Devenir créateur
                </Button>
              </div>
            )}
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="fiaba-grid relative overflow-hidden px-5 pb-20 pt-36 lg:pb-28 lg:pt-48">
          <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.02fr_.98fr]">
            <div className="relative z-10 reveal">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-[11px] font-bold text-[#5e51c9]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#5b49e8]" /> Monétisez votre influence au Sénégal
              </div>
              <h1 className="mt-6 max-w-[650px] font-[var(--app-font-serif)] text-[clamp(3.15rem,7vw,6.5rem)] font-bold leading-[.92] tracking-[-.09em] text-[#27223f]">
                Votre audience <br />
                <span className="text-[#5b49e8]">mérite un salaire.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-[#6b677e]">
                Fiaba connecte les créateurs de contenu et les boutiques au Sénégal. Obtenez votre lien unique, partagez-le sur WhatsApp et Instagram, et recevez vos commissions directement sur Wave ou Orange Money.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {isLoggedIn ? (
                  <Button onClick={() => setLocation(dashboardPath)} testId="button-hero-dashboard">
                    Accéder à mon {dashboardLabel} {icon(ArrowUpRight01Icon, 17)}
                  </Button>
                ) : (
                  <Button onClick={() => setLocation("/sign-up")} testId="button-hero-start">
                    Devenir créateur Fiaba {icon(ArrowUpRight01Icon, 17)}
                  </Button>
                )}
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
                <span>+1 200 créateurs sénégalais déjà actifs</span>
              </div>
            </div>
            <div className="relative reveal reveal-delay-2">
              <div className="float relative rounded-[30px] bg-white/70 p-2.5 sm:p-5">
                <div className="relative overflow-hidden rounded-[22px]">
                  <img
                    src={`${import.meta.env.BASE_URL}images/influencer-4.jpg`}
                    alt="Créatrice de contenu et entrepreneure sociale sur smartphone"
                    className="h-[380px] w-full object-cover sm:h-[480px]"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#242046]/40 via-transparent to-transparent" />
                  {/* Floating earnings badge */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-white/95 p-2.5 backdrop-blur-md sm:bottom-4 sm:left-4 sm:right-4 sm:rounded-2xl sm:p-3">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-[#e7faf2] text-[#278e69] sm:h-9 sm:w-9">{icon(Wallet01Icon, 15)}</span>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-[#9290a2] sm:text-[10px]">Gains du jour</p>
                        <strong className="font-[var(--app-font-serif)] text-sm text-[#292541] sm:text-lg">12 500 F</strong>
                      </div>
                    </div>
                    <span className="rounded-full bg-[#e9faf3] px-2 py-0.5 text-[9px] font-bold text-[#2d9b71] sm:px-2.5 sm:py-1 sm:text-[10px]">+3 ventes</span>
                  </div>
                </div>
                {/* Floating notification cards */}
                <div className="absolute -right-2 top-4 rounded-xl bg-white p-2 shadow-lg sm:-right-6 sm:top-6 sm:rounded-2xl sm:p-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#3f3a59] sm:gap-2 sm:text-xs">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[#fff4de] text-[#ac741e] sm:h-7 sm:w-7">{icon(Fire02Icon, 14)}</span>
                    <span className="text-[#ac741e]">Tendance</span>
                  </div>
                </div>
                <div className="absolute -bottom-3 -left-2 rounded-xl bg-white p-2 shadow-lg sm:-bottom-4 sm:-left-9 sm:rounded-2xl sm:p-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#3f3a59] sm:gap-2 sm:text-xs">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[#e7f9f1] text-[#2d9e72] sm:h-7 sm:w-7">{icon(CheckmarkCircle02Icon, 14)}</span>
                    <span className="text-[#2d9e72]">+4 500 F</span>
                  </div>
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
              <p className="mt-1 text-xs text-[#d5cfff]">créateurs actifs au Sénégal</p>
            </div>
            <div>
              <strong className="font-[var(--app-font-serif)] text-2xl">86M F</strong>
              <p className="mt-1 text-xs text-[#d5cfff]">versés aux influenceurs</p>
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
                Trois étapes. Zéro friction.
              </h2>
              <p className="mt-5 leading-7 text-[#77738a]">
                De la découverte du produit au retrait de vos gains, tout est pensé pour les créateurs sénégalais. Pas de contrat compliqué, pas de délai bancaire.
              </p>
            </div>
            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {[
                [Store01Icon, "01", "Choisissez une campagne", "Parcourez les marques sénégalaises qui cherchent des créateurs. Sélectionnez les produits qui parlent à votre audience."],
                [Share02Icon, "02", "Partagez avec votre style", "Générez un lien unique, partagez-le sur WhatsApp, Instagram, TikTok. Restez authentique, parlez avec vos mots."],
                [Wallet01Icon, "03", "Encaissez vos gains", "Chaque vente validée déclenche votre commission. Retirez sur Wave ou Orange Money en un clic, sous 7 jours."],
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

        {/* Earnings simulator */}
        <section className="px-5 py-24 lg:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#5b49e8]">Simulateur</p>
              <h2 className="mt-4 mx-auto max-w-2xl font-[var(--app-font-serif)] text-4xl font-bold leading-tight tracking-[-.06em] sm:text-5xl">
                Combien pourriez-vous gagner ?
              </h2>
              <p className="mt-5 leading-7 text-[#77738a]">
                Ajustez votre audience et votre réseau pour estimer vos revenus mensuels sur Fiaba.
              </p>
            </div>
            <EarningsSimulator />
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
                Activez l'armée de créateurs du Sénégal.
              </h2>
              <p className="mt-5 leading-7 text-[#77738a]">
                Accédez à un réseau de créateurs qui connaissent votre marché. Vous fixez les commissions, vous gardez le contrôle, ils parlent avec leur voix. Le marketing d'influence, version sénégalaise.
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

        {/* For creators / influencers */}
        <section className="bg-[#f0effa] px-5 py-24 lg:py-32">
          <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.2fr_.8fr]">
            <div className="relative order-2 lg:order-1">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="overflow-hidden rounded-[23px] bg-white">
                  <img src={`${import.meta.env.BASE_URL}images/influencer-1.jpg`} alt="Créatrice de contenu" className="h-44 w-full object-cover" loading="lazy" />
                  <div className="p-5">
                    <span className="text-[#5b49e8]">{icon(Share02Icon, 23)}</span>
                    <h3 className="mt-3 font-[var(--app-font-serif)] text-lg font-bold">Partagez avec vos mots</h3>
                    <p className="mt-2 text-sm leading-6 text-[#6f6a83]">Recommandez des produits que vous aimez, pas des pubs que vous subissez.</p>
                  </div>
                </div>
                <div className="overflow-hidden rounded-[23px] bg-[#fff4de] sm:translate-y-7">
                  <img src={`${import.meta.env.BASE_URL}images/influencer-3.jpg`} alt="Influenceuse sénégalaise" className="h-44 w-full object-cover" loading="lazy" />
                  <div className="p-5">
                    <span className="text-[#ac741e]">{icon(Wallet01Icon, 23)}</span>
                    <h3 className="mt-3 font-[var(--app-font-serif)] text-lg font-bold">Gagnez à chaque vente</h3>
                    <p className="mt-2 text-sm leading-6 text-[#6f6a83]">Une commission claire sur chaque commande livrée. Sans surprise.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#5b49e8]">Pour les créateurs</p>
              <h2 className="mt-4 font-[var(--app-font-serif)] text-4xl font-bold leading-tight tracking-[-.06em] sm:text-5xl">
                Votre voix vaut de l'or.
              </h2>
              <p className="mt-5 leading-7 text-[#77738a]">
                Vous avez construit une communauté qui vous fait confiance. Fiaba la transforme en revenus réels. Partagez un lien, suivez vos ventes en temps réel, retirez vos gains sur Wave ou Orange Money. Aucun abonnement, aucune avance. Vous gagnez quand ça marche.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  "Aucun minimum d'abonnés requis",
                  "Commission de 5 à 15% par vente livrée",
                  "Retrait instantané sur Wave & Orange Money",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-sm font-bold text-[#4a4660]">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-[#e7faf2] text-[#278e69]">{icon(CheckmarkCircle02Icon, 13)}</span>
                    {item}
                  </div>
                ))}
              </div>
              <Button className="mt-7" variant="soft" onClick={() => setLocation("/sign-up")} testId="button-seller-start">
                Devenir créateur Fiaba {icon(ArrowUpRight01Icon, 17)}
              </Button>
            </div>
          </div>
        </section>

        {/* Creator showcase carousel */}
        <section className="bg-[#f8f8fc] py-24 lg:py-32">
          <div className="mx-auto max-w-6xl px-5">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#5b49e8]">La communauté Fiaba</p>
              <h2 className="mt-4 font-[var(--app-font-serif)] text-4xl font-bold leading-tight tracking-[-.06em] sm:text-5xl">
                Des créateurs qui font bouger le commerce.
              </h2>
              <p className="mt-5 leading-7 text-[#77738a]">
                Influenceurs lifestyle, petits créateurs, créatrices de mode. Ils partagent les produits qu'ils aiment et gagnent à chaque vente.
              </p>
            </div>
          </div>
          {/* Carousel with edge blur */}
          <div className="relative mt-16">
            <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-[#f8f8fc] to-transparent sm:w-32" />
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-[#f8f8fc] to-transparent sm:w-32" />
            <div
              ref={creatorRef}
              className="flex gap-4 overflow-x-auto px-5 pb-4 sm:gap-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              data-testid="creator-carousel"
            >
              {[...creatorCards, ...creatorCards].map((c, i) => (
                <div
                  key={`creator-${i}`}
                  className="group w-[160px] shrink-0 overflow-hidden rounded-[20px] bg-white transition hover:-translate-y-1 sm:w-[300px] sm:rounded-[24px]"
                >
                  <div className="relative h-48 overflow-hidden sm:h-60">
                    <img
                      src={`${import.meta.env.BASE_URL}images/${c.img}`}
                      alt={`Créateur ${c.name}`}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#242046]/80 via-[#242046]/10 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4">
                      <p className="text-sm font-bold text-white sm:text-base">{c.name}</p>
                      <p className="text-[10px] text-white/80 sm:text-xs">{c.niche}</p>
                      <span className="mt-1.5 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-[10px]">{c.followers} abonnés</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 sm:p-5">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-[#9290a2] sm:text-[10px]">Gains cumulés</p>
                      <strong className="font-[var(--app-font-serif)] text-base text-[#292541] sm:text-xl">{c.earnings}</strong>
                    </div>
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#e7faf2] text-[#278e69] sm:h-10 sm:w-10">{icon(Wallet01Icon, 18)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials carousel */}
        <section id="temoignages" className="bg-[#242046] py-24 text-white lg:py-32">
          <div className="mx-auto max-w-6xl px-5">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#a9a0ff]">Paroles du réseau</p>
              <h2 className="mt-4 mx-auto max-w-2xl font-[var(--app-font-serif)] text-4xl font-bold tracking-[-.06em] sm:text-5xl">
                Ils monétisent leur influence. Ils en parlent.
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
              className="flex gap-6 overflow-x-auto px-5 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              data-testid="testimonial-carousel"
            >
              {[...testimonials, ...testimonials].map((t, i) => (
                <div
                  key={`testimonial-${i}`}
                  className="w-[300px] shrink-0 rounded-[24px] bg-white/5 p-7 backdrop-blur-sm transition hover:bg-white/10 sm:w-[360px]"
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
              {/* Créateur plan */}
              <div className="rounded-[28px] bg-white p-8">
                <div className="flex items-center gap-2">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#efedff] text-[#5b49e8]">{icon(Share02Icon, 20, 2)}</span>
                  <h3 className="font-[var(--app-font-serif)] text-xl font-bold">Créateur</h3>
                </div>
                <div className="mt-6 flex items-end gap-1">
                  <span className="font-[var(--app-font-serif)] text-5xl font-bold tracking-[-.06em] text-[#211c42]">Gratuit</span>
                </div>
                <p className="mt-2 text-sm text-[#77738a]">Inscription sans frais. Vous touchez votre commission à chaque vente livrée.</p>
                <ul className="mt-6 space-y-3 text-sm text-[#4a4660]">
                  {["Accès aux campagnes des marques sénégalaises", "Liens de partage illimités", "Suivi des ventes en temps réel", "Retrait sur Wave & Orange Money", "Commission de 5 à 15% par vente", "Aucun minimum d'abonnés requis"].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#e7faf2] text-[#278e69]">{icon(CheckmarkCircle02Icon, 13)}</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="mt-8 w-full" variant="soft" onClick={() => setLocation("/sign-up")} testId="button-plan-seller">
                  Devenir créateur {icon(ArrowUpRight01Icon, 16)}
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
              Votre prochaine story peut vous payer le mois.
            </h2>
            <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-[#d5cfff]">
              Rejoignez les créateurs et marques qui transforment déjà leur influence en revenus réels au Sénégal.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button variant="white" onClick={() => setLocation("/sign-up")} testId="button-final-start">
                Commencer gratuitement {icon(ArrowUpRight01Icon, 17)}
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
                La plateforme qui monétise l'influence au Sénégal. Pensé à Dakar, construit pour les créateurs qui font bouger le commerce.
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
                <li><a href="#temoignages" className="hover:text-[#5b49e8]">Nos créateurs</a></li>
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
  useScrollToTop();
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/seller/onboarding" component={SellerOnboarding} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/checkout/:id" component={Checkout} />
        <Route path="/p/:id" component={ProductLinkRedirect} />
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
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={basePath}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
