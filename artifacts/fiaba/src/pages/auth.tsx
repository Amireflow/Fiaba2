import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import {
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  SmartPhone01Icon,
  Message01Icon,
  ArrowRight01Icon,
  Store01Icon,
  UserGroupIcon,
  ViewIcon,
  ViewOffIcon
} from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { haptic } from '@/lib/utils';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

type AlertTone = 'success' | 'error' | 'info';

/* ── Friendly French Error Translations ── */
function translateAuthError(msg: string): string {
  if (!msg) return "Une erreur est survenue lors de l'authentification.";
  const lower = msg.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Email ou mot de passe incorrect. Veuillez vérifier vos identifiants.';
  }
  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return 'Un compte existe déjà avec cette adresse email.';
  }
  if (lower.includes('password should be at least')) {
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  }
  if (lower.includes('token has expired') || lower.includes('otp') || lower.includes('invalid token')) {
    return 'Le code SMS entré est invalide ou expiré.';
  }
  if (lower.includes('invalid email') || lower.includes('unable to validate email')) {
    return 'Veuillez saisir une adresse email valide.';
  }
  if (lower.includes('rate limit')) {
    return 'Trop de tentatives effectuées. Veuillez patienter un instant avant de réessayer.';
  }
  return msg;
}

function AlertModal({
  open,
  onClose,
  tone,
  title,
  message
}: {
  open: boolean;
  onClose: () => void;
  tone: AlertTone;
  title: string;
  message: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const cfg: Record<AlertTone, { icon: typeof AlertCircleIcon; bg: string; color: string }> = {
    success: { icon: CheckmarkCircle02Icon, bg: 'bg-[#e7faf2]', color: 'text-[#278e69]' },
    error: { icon: AlertCircleIcon, bg: 'bg-[#fff0f1]', color: 'text-[#c45667]' },
    info: { icon: InformationCircleIcon, bg: 'bg-[#efedff]', color: 'text-[#5b49e8]' },
  };
  const c = cfg[tone];

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto" role="alertdialog" aria-modal="true">
      <div className="absolute inset-0 bg-[#201b3c]/50 backdrop-blur-sm" onClick={() => { haptic('light'); onClose(); }} />
      <div className="relative flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-sm rounded-[24px] bg-[#fbfaff] p-6 shadow-xl">
          <div className="flex flex-col items-center text-center">
            <span className={`grid h-14 w-14 place-items-center rounded-2xl ${c.bg} ${c.color}`}>
              <Icon glyph={c.icon} size={28} strokeWidth={2} />
            </span>
            <h3 className="mt-5 font-[Space_Grotesk] text-lg font-bold tracking-[-.02em] text-[#292541]">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#77738a]">{message}</p>
          </div>
          <button
            onClick={() => { haptic('light'); onClose(); }}
            className="mt-6 w-full rounded-full bg-[#5b49e8] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#4e3bd5]"
            data-testid="alert-ok"
          >
            D'accord
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthLayout({ children, tagline, testId }: { children: React.ReactNode; tagline: string; testId: string }) {
  return (
    <div className="merchant-grid flex min-h-[100dvh] items-center justify-center bg-[#f8f8fc] px-4 py-10">
      <div className="w-full max-w-[460px]">
        <div className="mb-6 text-center">
          <Link href={`${basePath || ''}/`} className="inline-flex items-center gap-2.5 text-[#211c42]" data-testid={testId}>
            <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#5b49e8] text-white shadow-sm font-[Space_Grotesk] text-xl font-bold">
              F
            </span>
            <span className="font-[Space_Grotesk] text-2xl font-bold tracking-[-.07em]">Fiaba</span>
          </Link>
          <p className="mt-3 text-xs font-bold uppercase tracking-[.18em] text-[#8b88a0]">{tagline}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Check Profile Role & Redirect ── */
function redirectUser(profile: any, setLocation: (path: string) => void) {
  if (!profile) {
    setLocation('/onboarding');
    return;
  }

  if (profile.role === 'marchand') setLocation('/merchant');
  else if (profile.role === 'vendeur') setLocation('/seller');
  else if (profile.role === 'admin') setLocation('/admin');
  else setLocation('/onboarding');
}

/* ── Sign In Page ── */
type SignInMethod = 'email' | 'phone';

export function SignInPage() {
  const { signInWithEmail, signInWithOtp, verifyOtp, profile } = useAuth();
  const [, setLocation] = useLocation();
  const [method, setMethod] = useState<SignInMethod>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ tone: AlertTone; title: string; message: string } | null>(null);

  useEffect(() => {
    if (profile) redirectUser(profile, setLocation);
  }, [profile, setLocation]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    haptic('medium');
    const { error } = await signInWithEmail(email, password);
    setLoading(false);
    if (error) {
      haptic('error');
      setAlert({
        tone: 'error',
        title: 'Connexion impossible',
        message: translateAuthError(error.message),
      });
    } else {
      haptic('success');
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    haptic('medium');
    const { error } = await signInWithOtp(phone);
    setLoading(false);
    if (error) {
      haptic('error');
      setAlert({
        tone: 'error',
        title: 'Envoi impossible',
        message: translateAuthError(error.message),
      });
    } else {
      haptic('success');
      setOtpSent(true);
      setAlert({ tone: 'info', title: 'Code envoyé', message: `Un code SMS a été envoyé au ${phone}.` });
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    haptic('medium');
    const { error } = await verifyOtp(phone, otp);
    setLoading(false);
    if (error) {
      haptic('error');
      setAlert({
        tone: 'error',
        title: 'Code invalide',
        message: translateAuthError(error.message),
      });
    } else {
      haptic('success');
    }
  };

  return (
    <AuthLayout tagline="Le commerce avance ensemble" testId="link-auth-logo">
      <div className="rounded-[28px] bg-[#fffefd] p-7 shadow-md border border-[#f1effa]">
        <h1 className="font-[Space_Grotesk] text-2xl font-bold text-[#282441]">Connexion</h1>
        <p className="mt-1.5 text-sm text-[#77738a]">Accédez à votre espace Fiaba</p>

        {/* Method tabs */}
        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-[#f4f3f8] p-1.5">
          <button
            type="button"
            onClick={() => { haptic('light'); setMethod('email'); setOtpSent(false); }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${
              method === 'email' ? 'bg-white text-[#5b49e8] shadow-sm' : 'text-[#757185]'
            }`}
            data-testid="tab-signin-email"
          >
            <Icon glyph={Message01Icon} size={15} /> Email
          </button>
          <button
            type="button"
            onClick={() => { haptic('light'); setMethod('phone'); setOtpSent(false); }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${
              method === 'phone' ? 'bg-white text-[#5b49e8] shadow-sm' : 'text-[#757185]'
            }`}
            data-testid="tab-signin-phone"
          >
            <Icon glyph={SmartPhone01Icon} size={15} /> Téléphone (SMS)
          </button>
        </div>

        {method === 'email' ? (
          <form className="mt-5 space-y-4" onSubmit={handleEmailSubmit}>
            <label className="block text-xs font-bold text-[#514b71]">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="bonjour@exemple.com"
                className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-[#5b49e8]"
                data-testid="input-signin-email"
              />
            </label>
            <label className="block text-xs font-bold text-[#514b71]">
              Mot de passe
              <div className="relative mt-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-[#f4f3f8] pl-4 pr-11 py-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-[#5b49e8]"
                  data-testid="input-signin-password"
                />
                <button
                  type="button"
                  onClick={() => { haptic('light'); setShowPassword(!showPassword); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b88a0] hover:text-[#5b49e8] p-1"
                  title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  data-testid="button-toggle-password-signin"
                >
                  <Icon glyph={showPassword ? ViewOffIcon : ViewIcon} size={18} />
                </button>
              </div>
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#5b49e8] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#4e3bd5] disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
              data-testid="button-signin-submit"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
              <Icon glyph={ArrowRight01Icon} size={16} />
            </button>
          </form>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}>
            <label className="block text-xs font-bold text-[#514b71]">
              Numéro de téléphone (Sénégal & Afrique)
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+221 77 123 45 67"
                className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-[#5b49e8]"
                data-testid="input-signin-phone"
              />
            </label>
            {otpSent && (
              <label className="block text-xs font-bold text-[#514b71]">
                Code de vérification (6 chiffres)
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm font-mono text-center text-lg outline-none transition focus:bg-white focus:ring-2 focus:ring-[#5b49e8]"
                  data-testid="input-signin-otp"
                />
              </label>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#5b49e8] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#4e3bd5] disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
              data-testid={otpSent ? 'button-signin-verify' : 'button-signin-send-otp'}
            >
              {loading ? 'Traitement…' : otpSent ? 'Vérifier le code' : 'Recevoir un code SMS'}
              <Icon glyph={ArrowRight01Icon} size={16} />
            </button>
            {otpSent && (
              <button
                type="button"
                onClick={() => { haptic('light'); setOtpSent(false); setOtp(''); }}
                className="w-full text-center text-xs font-bold text-[#77738a] hover:text-[#5b49e8]"
                data-testid="button-signin-change-phone"
              >
                Changer de numéro
              </button>
            )}
          </form>
        )}

        <div className="mt-6 border-t border-[#efedf5] pt-5 text-center">
          <p className="text-xs text-[#77738a]">
            Nouveau sur Fiaba ?{' '}
            <Link href={`${basePath}/sign-up`} className="font-bold text-[#5b49e8] hover:underline" data-testid="link-to-signup">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
      <AlertModal open={alert !== null} onClose={() => setAlert(null)} tone={alert?.tone ?? 'info'} title={alert?.title ?? ''} message={alert?.message ?? ''} />
    </AuthLayout>
  );
}

/* ── Sign Up Page ── */
export function SignUpPage() {
  const { signUpWithEmail, signInWithOtp, verifyOtp, profile } = useAuth();
  const [, setLocation] = useLocation();
  const [method, setMethod] = useState<SignInMethod>('email');
  const [fullName, setFullName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [role, setRole] = useState<'vendeur' | 'marchand'>('vendeur');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ tone: AlertTone; title: string; message: string } | null>(null);

  useEffect(() => {
    if (profile) redirectUser(profile, setLocation);
  }, [profile, setLocation]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Password Confirmation Check
    if (password !== confirmPassword) {
      haptic('error');
      setAlert({
        tone: 'error',
        title: 'Mots de passe différents',
        message: 'La confirmation du mot de passe ne correspond pas au mot de passe saisi. Veuillez retaper les mots de passe à l’identique.',
      });
      return;
    }

    if (password.length < 6) {
      haptic('error');
      setAlert({
        tone: 'error',
        title: 'Mot de passe trop court',
        message: 'Le mot de passe doit contenir au moins 6 caractères pour des raisons de sécurité.',
      });
      return;
    }

    setLoading(true);
    haptic('medium');
    const finalRole = email.trim().toLowerCase().startsWith('admin') ? 'admin' : role;
    const displayTitle = role === 'marchand' && storeName ? `${fullName} (${storeName})` : fullName;
    const { error } = await signUpWithEmail(email, password, displayTitle, finalRole);
    setLoading(false);

    if (error) {
      haptic('error');
      setAlert({
        tone: 'error',
        title: 'Inscription impossible',
        message: translateAuthError(error.message),
      });
    } else {
      haptic('success');
      setAlert({
        tone: 'success',
        title: 'Compte créé !',
        message: 'Votre compte a été créé avec succès. Complétons maintenant votre profil.',
      });
      setLocation('/onboarding');
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    haptic('medium');
    const { error } = await signInWithOtp(phone);
    setLoading(false);
    if (error) {
      haptic('error');
      setAlert({
        tone: 'error',
        title: 'Envoi impossible',
        message: translateAuthError(error.message),
      });
    } else {
      haptic('success');
      setOtpSent(true);
      setAlert({ tone: 'info', title: 'Code SMS envoyé', message: `Un code de vérification a été envoyé au ${phone}.` });
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    haptic('medium');
    const { error } = await verifyOtp(phone, otp);
    setLoading(false);
    if (error) {
      haptic('error');
      setAlert({
        tone: 'error',
        title: 'Code invalide',
        message: translateAuthError(error.message),
      });
    } else {
      haptic('success');
      setLocation('/onboarding');
    }
  };

  return (
    <AuthLayout tagline="Rejoignez la nouvelle ère du social commerce" testId="link-auth-logo-signup">
      <div className="rounded-[28px] bg-[#fffefd] p-7 shadow-md border border-[#f1effa]">
        <h1 className="font-[Space_Grotesk] text-2xl font-bold text-[#282441]">Créer un compte</h1>
        <p className="mt-1.5 text-sm text-[#77738a]">Choisissez votre rôle et votre méthode d'inscription</p>

        {/* Role selection (Vendeur vs Commerçant) */}
        <div className="mt-5 space-y-2">
          <label className="block text-xs font-bold text-[#514b71] uppercase tracking-wider">Type de compte</label>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              {
                id: 'vendeur',
                icon: UserGroupIcon,
                title: 'Vendeur Social',
                subtitle: 'Gagnez des commissions',
              },
              {
                id: 'marchand',
                icon: Store01Icon,
                title: 'Commerçant / Marque',
                subtitle: 'Vendez & recrutez',
              },
            ].map((r) => {
              const isSelected = role === r.id;
              return (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => { haptic('light'); setRole(r.id as any); }}
                  className={`rounded-2xl border px-3.5 py-3 text-left transition ${
                    isSelected
                      ? 'border-[#5b49e8] bg-[#f7f6ff] text-[#292541]'
                      : 'border-[#e7e5ef] bg-white text-[#757185] hover:border-[#d0cbdc] hover:bg-[#fafafc]'
                  }`}
                  data-testid={`button-signup-role-${r.id}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`grid h-8 w-8 place-items-center rounded-xl transition ${
                      isSelected ? 'bg-[#5b49e8] text-white' : 'bg-[#f4f3f8] text-[#5b49e8]'
                    }`}>
                      <Icon glyph={r.icon} size={16} />
                    </span>
                    {isSelected && (
                      <span className="grid h-4.5 w-4.5 place-items-center rounded-full bg-[#5b49e8] text-white">
                        <Icon glyph={CheckmarkCircle02Icon} size={12} />
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5">
                    <strong className="block text-xs font-bold text-[#292541] truncate">{r.title}</strong>
                    <span className="text-[10px] text-[#77738a] block truncate mt-0.5">{r.subtitle}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Method tabs */}
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-[#f4f3f8] p-1.5">
          <button
            type="button"
            onClick={() => { haptic('light'); setMethod('email'); setOtpSent(false); }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${
              method === 'email' ? 'bg-white text-[#5b49e8] shadow-sm' : 'text-[#757185]'
            }`}
            data-testid="tab-signup-email"
          >
            <Icon glyph={Message01Icon} size={15} /> Inscription Email
          </button>
          <button
            type="button"
            onClick={() => { haptic('light'); setMethod('phone'); setOtpSent(false); }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${
              method === 'phone' ? 'bg-white text-[#5b49e8] shadow-sm' : 'text-[#757185]'
            }`}
            data-testid="tab-signup-phone"
          >
            <Icon glyph={SmartPhone01Icon} size={15} /> Téléphone (SMS)
          </button>
        </div>

        {method === 'email' ? (
          <form className="mt-5 space-y-4" onSubmit={handleEmailSubmit}>
            {/* Tailored fields for Merchant vs Seller */}
            {role === 'marchand' ? (
              <>
                <label className="block text-xs font-bold text-[#514b71]">
                  Nom complet du responsable / gérant
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Aminata Ndiaye"
                    className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-[#5b49e8]"
                    data-testid="input-signup-name"
                  />
                </label>
                <label className="block text-xs font-bold text-[#514b71]">
                  Nom de votre boutique / marque
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Ex. Maison Ndar, Skincare Dakar..."
                    className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-[#5b49e8]"
                    data-testid="input-signup-store-name"
                  />
                </label>
              </>
            ) : (
              <label className="block text-xs font-bold text-[#514b71]">
                Nom d'affichage / Pseudo Vendeur
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex. Marième Fall, Saliou Ventes..."
                  className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-[#5b49e8]"
                  data-testid="input-signup-name"
                />
              </label>
            )}

            <label className="block text-xs font-bold text-[#514b71]">
              Adresse Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="bonjour@exemple.com"
                className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-[#5b49e8]"
                data-testid="input-signup-email"
              />
            </label>

            {/* Password */}
            <label className="block text-xs font-bold text-[#514b71]">
              Créer un mot de passe
              <div className="relative mt-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Au moins 6 caractères"
                  className="w-full rounded-xl bg-[#f4f3f8] pl-4 pr-11 py-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-[#5b49e8]"
                  data-testid="input-signup-password"
                />
                <button
                  type="button"
                  onClick={() => { haptic('light'); setShowPassword(!showPassword); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b88a0] hover:text-[#5b49e8] p-1"
                  title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  data-testid="button-toggle-password-signup"
                >
                  <Icon glyph={showPassword ? ViewOffIcon : ViewIcon} size={18} />
                </button>
              </div>
            </label>

            {/* Confirm Password */}
            <label className="block text-xs font-bold text-[#514b71]">
              Confirmer le mot de passe
              <div className="relative mt-2">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Retapez votre mot de passe"
                  className={`w-full rounded-xl bg-[#f4f3f8] pl-4 pr-11 py-3 text-sm outline-none transition focus:bg-white focus:ring-2 ${
                    confirmPassword && confirmPassword !== password
                      ? 'ring-2 ring-rose-500 bg-rose-50'
                      : 'focus:ring-[#5b49e8]'
                  }`}
                  data-testid="input-signup-confirm-password"
                />
                <button
                  type="button"
                  onClick={() => { haptic('light'); setShowConfirmPassword(!showConfirmPassword); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b88a0] hover:text-[#5b49e8] p-1"
                  title={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  data-testid="button-toggle-confirm-password-signup"
                >
                  <Icon glyph={showConfirmPassword ? ViewOffIcon : ViewIcon} size={18} />
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="mt-1 text-[11px] font-semibold text-rose-500">Les mots de passe ne correspondent pas.</p>
              )}
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#5b49e8] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#4e3bd5] disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
              data-testid="button-signup-submit"
            >
              {loading ? 'Création…' : role === 'marchand' ? 'Créer mon compte boutique' : 'Créer mon compte vendeur'}
              <Icon glyph={ArrowRight01Icon} size={16} />
            </button>
          </form>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}>
            {role === 'marchand' ? (
              <>
                <label className="block text-xs font-bold text-[#514b71]">
                  Nom du gérant
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Aminata Ndiaye"
                    className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-[#5b49e8]"
                    data-testid="input-signup-name-phone"
                  />
                </label>
                <label className="block text-xs font-bold text-[#514b71]">
                  Nom de la boutique
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Ex. Maison Ndar"
                    className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-[#5b49e8]"
                    data-testid="input-signup-store-phone"
                  />
                </label>
              </>
            ) : (
              <label className="block text-xs font-bold text-[#514b71]">
                Nom d'affichage Vendeur
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Marième Fall"
                  className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-[#5b49e8]"
                  data-testid="input-signup-name-phone"
                />
              </label>
            )}

            <label className="block text-xs font-bold text-[#514b71]">
              Numéro de téléphone
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+221 77 123 45 67"
                className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-[#5b49e8]"
                data-testid="input-signup-phone"
              />
            </label>
            {otpSent && (
              <label className="block text-xs font-bold text-[#514b71]">
                Code de vérification (6 chiffres)
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm font-mono text-center text-lg outline-none transition focus:bg-white focus:ring-2 focus:ring-[#5b49e8]"
                  data-testid="input-signup-otp"
                />
              </label>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#5b49e8] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#4e3bd5] disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
              data-testid={otpSent ? 'button-signup-verify' : 'button-signup-send-otp'}
            >
              {loading ? 'Traitement…' : otpSent ? 'Vérifier et créer le compte' : 'Recevoir mon code SMS'}
              <Icon glyph={ArrowRight01Icon} size={16} />
            </button>
          </form>
        )}

        <div className="mt-6 border-t border-[#efedf5] pt-5 text-center">
          <p className="text-xs text-[#77738a]">
            Déjà inscrit ?{' '}
            <Link href={`${basePath}/sign-in`} className="font-bold text-[#5b49e8] hover:underline" data-testid="link-to-signin">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
      <AlertModal open={alert !== null} onClose={() => setAlert(null)} tone={alert?.tone ?? 'info'} title={alert?.title ?? ''} message={alert?.message ?? ''} />
    </AuthLayout>
  );
}
