import { useState, useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { AlertCircleIcon, CheckmarkCircle02Icon, InformationCircleIcon, SmartPhone01Icon, Message01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';
import { haptic } from '@/lib/utils';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

type AlertTone = 'success' | 'error' | 'info';

function AlertModal({ open, onClose, tone, title, message }: { open: boolean; onClose: () => void; tone: AlertTone; title: string; message: string }) {
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
          <button onClick={() => { haptic('light'); onClose(); }} className="mt-6 w-full rounded-full bg-[#5b49e8] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#4e3bd5]" data-testid="alert-ok">
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthLayout({ children, tagline, testId }: { children: React.ReactNode; tagline: string; testId: string }) {
  return (
    <div className="merchant-grid flex min-h-[100dvh] items-center justify-center bg-[#f8f8fc] px-4 py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 text-center">
          <Link href={`${basePath || ''}/`} className="inline-flex items-center gap-2.5 text-[#211c42]" data-testid={testId}>
            <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#5b49e8] text-white shadow-sm">
              <span className="font-[Space_Grotesk] text-xl font-bold">F</span>
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

/* ── Role-based redirect ── */
function redirectByRole(profile: any, setLocation: (path: string) => void) {
  if (!profile) return;
  if (profile.role === 'marchand') {
    if (!profile.phone || !profile.city) {
      setLocation('/onboarding');
    } else {
      setLocation('/merchant');
    }
  } else if (profile.role === 'vendeur') {
    if (!profile.phone || !profile.city) {
      setLocation('/seller/onboarding');
    } else {
      setLocation('/seller');
    }
  } else if (profile.role === 'admin') {
    setLocation('/admin');
  } else {
    setLocation('/onboarding');
  }
}

/* ── Sign In ── */

type SignInMethod = 'email' | 'phone';

export function SignInPage() {
  const { signInWithEmail, signInWithOtp, verifyOtp, profile } = useAuth();
  const [, setLocation] = useLocation();
  const [method, setMethod] = useState<SignInMethod>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ tone: AlertTone; title: string; message: string } | null>(null);

  /* Redirect if already logged in */
  useEffect(() => {
    if (profile) redirectByRole(profile, setLocation);
  }, [profile, setLocation]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    haptic('medium');
    const { error } = await signInWithEmail(email, password);
    setLoading(false);
    if (error) {
      haptic('error');
      setAlert({ tone: 'error', title: 'Connexion impossible', message: error.message });
    } else {
      haptic('success');
      setAlert({ tone: 'success', title: 'Bienvenue !', message: 'Vous êtes connecté.' });
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
      setAlert({ tone: 'error', title: 'Envoi impossible', message: error.message });
    } else {
      haptic('success');
      setOtpSent(true);
      setAlert({ tone: 'info', title: 'Code envoyé', message: `Un code de vérification a été envoyé au ${phone}.` });
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
      setAlert({ tone: 'error', title: 'Code invalide', message: error.message });
    } else {
      haptic('success');
      setAlert({ tone: 'success', title: 'Bienvenue !', message: 'Vous êtes connecté.' });
    }
  };

  return (
    <AuthLayout tagline="Le commerce avance ensemble" testId="link-auth-logo">
      <div className="rounded-[28px] bg-[#fffefd] p-7 shadow-md">
        <h1 className="font-[Space_Grotesk] text-2xl font-bold text-[#282441]">Bon retour parmi nous</h1>
        <p className="mt-2 text-sm text-[#77738a]">Connectez-vous à votre espace Fiaba</p>

        {/* Method tabs */}
        <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-[#f4f3f8] p-1">
          <button
            type="button"
            onClick={() => { haptic('light'); setMethod('email'); setOtpSent(false); }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${method === 'email' ? 'bg-white text-[#5b49e8] shadow-sm' : 'text-[#757185]'}`}
            data-testid="tab-signin-email"
          >
            <Icon glyph={Message01Icon} size={14} /> Email
          </button>
          <button
            type="button"
            onClick={() => { haptic('light'); setMethod('phone'); setOtpSent(false); }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${method === 'phone' ? 'bg-white text-[#5b49e8] shadow-sm' : 'text-[#757185]'}`}
            data-testid="tab-signin-phone"
          >
            <Icon glyph={SmartPhone01Icon} size={14} /> Téléphone
          </button>
        </div>

        {method === 'email' ? (
          <form className="mt-4 space-y-4" onSubmit={handleEmailSubmit}>
            <label className="block text-xs font-bold text-[#514b71]">Email
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="bonjour@exemple.com" className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-1 focus:ring-[#5b49e8]" data-testid="input-signin-email" />
            </label>
            <label className="block text-xs font-bold text-[#514b71]">Mot de passe
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-1 focus:ring-[#5b49e8]" data-testid="input-signin-password" />
            </label>
            <button type="submit" disabled={loading} className="w-full rounded-full bg-[#5b49e8] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#4e3bd5] disabled:opacity-50" data-testid="button-signin-submit">
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}>
            <label className="block text-xs font-bold text-[#514b71]">Numéro de téléphone
              <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+221 77 123 45 67" className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-1 focus:ring-[#5b49e8]" data-testid="input-signin-phone" />
            </label>
            {otpSent && (
              <label className="block text-xs font-bold text-[#514b71]">Code de vérification
                <input type="text" required maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456" className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-1 focus:ring-[#5b49e8]" data-testid="input-signin-otp" />
              </label>
            )}
            <button type="submit" disabled={loading} className="w-full rounded-full bg-[#5b49e8] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#4e3bd5] disabled:opacity-50" data-testid={otpSent ? 'button-signin-verify' : 'button-signin-send-otp'}>
              {loading ? 'Vérification…' : otpSent ? 'Vérifier le code' : 'Recevoir un code'}
            </button>
            {otpSent && (
              <button type="button" onClick={() => { haptic('light'); setOtpSent(false); setOtp(''); }} className="w-full text-center text-xs font-bold text-[#77738a] hover:text-[#5b49e8]" data-testid="button-signin-change-phone">
                Changer de numéro
              </button>
            )}
          </form>
        )}

        <p className="mt-5 text-center text-sm text-[#77738a]">Pas encore de compte ? <Link href={`${basePath}/sign-up`} className="font-bold text-[#5b49e8]" data-testid="link-to-signup">Créer un compte</Link></p>
      </div>
      <AlertModal open={alert !== null} onClose={() => setAlert(null)} tone={alert?.tone ?? 'info'} title={alert?.title ?? ''} message={alert?.message ?? ''} />
    </AuthLayout>
  );
}

/* ── Sign Up ── */

export function SignUpPage() {
  const { signUpWithEmail, signInWithOtp, verifyOtp, profile } = useAuth();
  const [, setLocation] = useLocation();
  const [method, setMethod] = useState<SignInMethod>('email');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [role, setRole] = useState<'vendeur' | 'marchand' | 'admin'>('vendeur');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ tone: AlertTone; title: string; message: string } | null>(null);

  useEffect(() => {
    if (profile) redirectByRole(profile, setLocation);
  }, [profile, setLocation]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    haptic('medium');
    const { error } = await signUpWithEmail(email, password, fullName, role);
    setLoading(false);
    if (error) {
      haptic('error');
      setAlert({ tone: 'error', title: 'Inscription impossible', message: error.message });
    } else {
      haptic('success');
      setAlert({ tone: 'success', title: 'Compte créé !', message: 'Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.' });
      setLocation('/sign-in');
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
      setAlert({ tone: 'error', title: 'Envoi impossible', message: error.message });
    } else {
      haptic('success');
      setOtpSent(true);
      setAlert({ tone: 'info', title: 'Code envoyé', message: `Un code de vérification a été envoyé au ${phone}.` });
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
      setAlert({ tone: 'error', title: 'Code invalide', message: error.message });
    } else {
      haptic('success');
      setAlert({ tone: 'success', title: 'Bienvenue !', message: 'Votre compte a été créé. Complétez votre profil pour commencer.' });
    }
  };

  return (
    <AuthLayout tagline="Votre réseau, votre mouvement" testId="link-auth-logo-signup">
      <div className="rounded-[28px] bg-[#fffefd] p-7 shadow-md">
        <h1 className="font-[Space_Grotesk] text-2xl font-bold text-[#282441]">Créer votre compte Fiaba</h1>
        <p className="mt-2 text-sm text-[#77738a]">Le commerce avance ensemble</p>

        {/* Role selection */}
        <div className="mt-6 grid grid-cols-3 gap-1.5">
          {(['vendeur', 'marchand', 'admin'] as const).map(r => (
            <button
              type="button"
              key={r}
              onClick={() => { haptic('light'); setRole(r); }}
              className={`rounded-xl border p-2.5 text-xs font-bold transition ${role === r ? 'border-[#5b49e8] bg-[#efedff] text-[#5040cf]' : 'border-[#e7e5ef] text-[#757185]'}`}
              data-testid={`button-signup-role-${r}`}
            >
              {r === 'vendeur' ? 'Je vends' : r === 'marchand' ? 'Je distribue' : 'Admin'}
            </button>
          ))}
        </div>

        {/* Method tabs */}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-[#f4f3f8] p-1">
          <button
            type="button"
            onClick={() => { haptic('light'); setMethod('email'); setOtpSent(false); }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${method === 'email' ? 'bg-white text-[#5b49e8] shadow-sm' : 'text-[#757185]'}`}
            data-testid="tab-signup-email"
          >
            <Icon glyph={Message01Icon} size={14} /> Email
          </button>
          <button
            type="button"
            onClick={() => { haptic('light'); setMethod('phone'); setOtpSent(false); }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${method === 'phone' ? 'bg-white text-[#5b49e8] shadow-sm' : 'text-[#757185]'}`}
            data-testid="tab-signup-phone"
          >
            <Icon glyph={SmartPhone01Icon} size={14} /> Téléphone
          </button>
        </div>

        {method === 'email' ? (
          <form className="mt-4 space-y-4" onSubmit={handleEmailSubmit}>
            <label className="block text-xs font-bold text-[#514b71]">Nom complet
              <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Aminata Ndiaye" className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-1 focus:ring-[#5b49e8]" data-testid="input-signup-name" />
            </label>
            <label className="block text-xs font-bold text-[#514b71]">Email
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="bonjour@exemple.com" className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-1 focus:ring-[#5b49e8]" data-testid="input-signup-email" />
            </label>
            <label className="block text-xs font-bold text-[#514b71]">Mot de passe
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-1 focus:ring-[#5b49e8]" data-testid="input-signup-password" />
            </label>
            <button type="submit" disabled={loading} className="w-full rounded-full bg-[#5b49e8] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#4e3bd5] disabled:opacity-50" data-testid="button-signup-submit">
              {loading ? 'Création…' : 'Créer mon compte'}
            </button>
          </form>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}>
            <label className="block text-xs font-bold text-[#514b71]">Nom complet
              <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Aminata Ndiaye" className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-1 focus:ring-[#5b49e8]" data-testid="input-signup-name-phone" />
            </label>
            <label className="block text-xs font-bold text-[#514b71]">Numéro de téléphone
              <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+221 77 123 45 67" className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-1 focus:ring-[#5b49e8]" data-testid="input-signup-phone" />
            </label>
            {otpSent && (
              <label className="block text-xs font-bold text-[#514b71]">Code de vérification
                <input type="text" required maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456" className="mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-1 focus:ring-[#5b49e8]" data-testid="input-signup-otp" />
              </label>
            )}
            <button type="submit" disabled={loading} className="w-full rounded-full bg-[#5b49e8] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#4e3bd5] disabled:opacity-50" data-testid={otpSent ? 'button-signup-verify' : 'button-signup-send-otp'}>
              {loading ? 'Vérification…' : otpSent ? 'Vérifier et créer' : 'Recevoir un code'}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-[#77738a]">Déjà un compte ? <Link href={`${basePath}/sign-in`} className="font-bold text-[#5b49e8]" data-testid="link-to-signin">Se connecter</Link></p>
      </div>
      <AlertModal open={alert !== null} onClose={() => setAlert(null)} tone={alert?.tone ?? 'info'} title={alert?.title ?? ''} message={alert?.message ?? ''} />
    </AuthLayout>
  );
}
