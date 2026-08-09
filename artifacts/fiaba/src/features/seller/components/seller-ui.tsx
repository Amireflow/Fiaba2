import { type ReactNode, useEffect } from 'react';
import { Link } from 'wouter';
import { AlertCircleIcon, Cancel01Icon, InformationCircleIcon } from '@hugeicons/core-free-icons';
import { Icon, type IconType } from '@/components/shared/icon';
import { haptic } from '@/lib/utils';

/* ── SellerLogo (matches MerchantLogo) ── */
export function SellerLogo({ light = true }: { light?: boolean }) {
  return (
    <Link href="/seller" className={`flex items-center gap-2.5 ${light ? 'text-white' : 'text-[#211c42]'}`} data-testid="link-seller-logo">
      <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-[#6b58f0] text-white shadow-sm">
        <span className="font-[Space_Grotesk] text-xl font-bold">F</span>
      </span>
      <span className="font-[Space_Grotesk] text-[21px] font-bold tracking-[-.06em]">Fiaba</span>
    </Link>
  );
}

const badgeTones = {
  violet: 'bg-[#efedff] text-[#5b49e8]',
  mint: 'bg-[#e7faf2] text-[#278e69]',
  amber: 'bg-[#fff4de] text-[#ac741e]',
  rose: 'bg-[#fff0f1] text-[#c45667]',
  slate: 'bg-[#f0eff5] text-[#716d82]',
} as const;

export type BadgeTone = keyof typeof badgeTones;

export function SellerBadge({ children, tone = 'violet', className = '' }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${badgeTones[tone]} ${className}`}>{children}</span>;
}

const buttonVariants = {
  primary: 'bg-[#5b49e8] text-white shadow-sm hover:bg-[#4e3bd5]',
  soft: 'bg-[#efedff] text-[#5040cf] hover:bg-[#e4e1ff]',
  ghost: 'text-[#67627b] hover:bg-[#f0eff8]',
  danger: 'bg-[#fff0f1] text-[#c45667] hover:bg-[#ffe0e2]',
  white: 'bg-white text-[#5040cf] hover:bg-[#f3f0ff]',
  success: 'bg-[#e7faf2] text-[#278e69] hover:bg-[#d4f3e6]',
} as const;

export type SellerButtonVariant = keyof typeof buttonVariants;

export function SellerButton({
  children,
  onClick,
  variant = 'primary',
  className = '',
  type = 'button',
  disabled = false,
  form,
  testId,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: SellerButtonVariant;
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  form?: string;
  testId?: string;
}) {
  return (
    <button
      type={type}
      onClick={() => { haptic('light'); onClick?.(); }}
      disabled={disabled}
      form={form}
      data-testid={testId}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${buttonVariants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/* ── Card (matches MerchantCard — no border) ── */
export function SellerCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[22px] bg-[#fffefd] p-5 text-[#292541] ${className}`}>{children}</div>;
}

/* ── ScrollTable ── */
export function SellerScrollTable({
  children,
  minWidth = 680,
  testId,
}: {
  children: ReactNode;
  minWidth?: number;
  testId?: string;
}) {
  return (
    <div className="merchant-scrollbar overflow-x-auto" data-testid={testId}>
      <div style={{ minWidth: `${minWidth}px` }}>{children}</div>
    </div>
  );
}

const statColors = {
  violet: 'bg-[#efedff] text-[#5b49e8]',
  mint: 'bg-[#e7faf2] text-[#278e69]',
  amber: 'bg-[#fff4de] text-[#ac741e]',
} as const;

export type StatTone = keyof typeof statColors;

/* ── Stat (matches merchant Stat layout) ── */
export function SellerStat({
  label,
  value,
  change,
  glyph,
  tone = 'violet',
}: {
  label: string;
  value: string;
  change: string;
  glyph: IconType;
  tone?: StatTone;
}) {
  return (
    <SellerCard className="p-3.5 sm:p-5 min-w-0">
      <div className="flex items-start justify-between gap-1">
        <span className={`grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-xl ${statColors[tone]}`}>
          <Icon glyph={glyph} size={18} />
        </span>
        {change && <span className={`text-[10px] font-bold ${change.startsWith('-') || change.startsWith('−') ? 'text-[#c45667]' : 'text-[#278e69]'}`}>{change}</span>}
      </div>
      <p className="mt-3 sm:mt-5 text-[9px] sm:text-[10px] font-bold uppercase tracking-[.1em] text-[#9290a2] truncate">{label}</p>
      <strong className="mt-1 block font-[Space_Grotesk] text-base sm:text-2xl font-bold tracking-[-.04em] text-[#292541] truncate">{value}</strong>
    </SellerCard>
  );
}

/* ── Page (matches merchant Page) ── */
export function SellerPage({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-10">
      <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#5b49e8]">{eyebrow}</p>
      <div className="mt-1.5 flex items-center justify-between gap-3 sm:mt-2">
        <h1 className="font-[Space_Grotesk] text-xl font-bold tracking-[-.06em] text-[#292541] sm:text-3xl lg:text-4xl">{title}</h1>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {description && <p className="mt-1 hidden max-w-xl text-sm leading-6 text-[#77738a] sm:mt-2 sm:block">{description}</p>}
      {children}
    </div>
  );
}

/* ── Field (matches merchant Field) ── */
export function SellerField({
  label,
  children,
  hint,
  className = '',
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-bold text-[#514b71]">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[10px] text-[#9290a2]">{hint}</span>}
    </label>
  );
}

export const sellerInputClass =
  'mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm text-[#292541] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#5b49e8] placeholder:text-[#b8b4c8]';

export const sellerSelectClass =
  'mt-2 w-full rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm text-[#292541] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#5b49e8]';

export const sellerTextareaClass =
  'mt-2 w-full resize-none rounded-xl bg-[#f4f3f8] px-4 py-3 text-sm leading-5 text-[#292541] outline-none transition focus:bg-white focus:ring-1 focus:ring-[#5b49e8] placeholder:text-[#b8b4c8]';

/* ── EmptyState (matches merchant EmptyState) ── */
export function SellerEmptyState({
  glyph,
  title,
  description,
  action,
}: {
  glyph: IconType;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-5 py-14 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f0eff5] text-[#9290a2]">
        <Icon glyph={glyph} size={26} />
      </span>
      <p className="mt-5 font-[Space_Grotesk] text-lg font-bold text-[#292541]">{title}</p>
      <p className="mx-auto mt-1.5 max-w-xs text-sm leading-6 text-[#77738a]">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/* ── SectionTitle (matches merchant SectionTitle) ── */
export function SellerSectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-bold text-[#292541]">{title}</p>
        {subtitle && <p className="mt-1 text-[11px] text-[#9290a2]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ── Drawer (matches merchant Drawer) ── */
export function SellerDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'max-w-[480px]',
  testId,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
  testId?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" data-testid={testId} role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[#201b3c]/75 sm:bg-[#201b3c]/75" onClick={onClose} data-testid="drawer-overlay" />
      <div className={`absolute inset-0 flex flex-col bg-[#fffefd] sm:inset-auto sm:right-0 sm:top-0 sm:h-full sm:w-full ${width} sm:shadow-lg`}>
        <div className="flex items-start justify-between px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-[Space_Grotesk] text-xl font-bold tracking-[-.04em] text-[#292541]">{title}</h2>
            {subtitle && <p className="mt-1 text-xs text-[#77738a]">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-[#8b89a3] transition hover:bg-[#f0eff8] hover:text-[#292541]" data-testid="drawer-close">
            <Icon glyph={Cancel01Icon} size={20} />
          </button>
        </div>
        <div className="merchant-scrollbar flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

/* ── Modal (centered dialog, same bg as page) ── */
export function SellerModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  testId,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  testId?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" data-testid={testId} role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[#201b3c]/50 backdrop-blur-sm" onClick={onClose} data-testid="modal-overlay" />
      <div className="relative flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg rounded-[24px] bg-[#fbfaff] shadow-xl">
          <div className="flex items-start justify-between px-6 pt-6">
            <div className="min-w-0">
              <h2 className="font-[Space_Grotesk] text-xl font-bold tracking-[-.04em] text-[#292541]">{title}</h2>
              {subtitle && <p className="mt-1 text-xs text-[#77738a]">{subtitle}</p>}
            </div>
            <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-[#8b89a3] transition hover:bg-[#f0eff8] hover:text-[#292541]" data-testid="modal-close">
              <Icon glyph={Cancel01Icon} size={20} />
            </button>
          </div>
          <div className="merchant-scrollbar max-h-[60vh] overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="px-6 pb-6">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

/* ── ConfirmDialog (matches merchant ConfirmDialog) ── */
export function SellerConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  tone = 'danger',
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const toneConfig = {
    danger: { icon: AlertCircleIcon, iconBg: 'bg-[#fff0f1]', iconColor: 'text-[#c45667]', btn: 'danger' as const },
    primary: { icon: InformationCircleIcon, iconBg: 'bg-[#efedff]', iconColor: 'text-[#5b49e8]', btn: 'primary' as const },
  };
  const cfg = toneConfig[tone];

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto" role="alertdialog" aria-modal="true">
      <div className="absolute inset-0 bg-[#201b3c]/50 backdrop-blur-sm" onClick={onClose} data-testid="confirm-overlay" />
      <div className="relative flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-sm rounded-[24px] bg-[#fbfaff] p-6 shadow-xl">
          <div className="flex flex-col items-center text-center">
            <span className={`grid h-14 w-14 place-items-center rounded-2xl ${cfg.iconBg} ${cfg.iconColor}`}>
              <Icon glyph={cfg.icon} size={28} strokeWidth={2} />
            </span>
            <h3 className="mt-5 font-[Space_Grotesk] text-lg font-bold tracking-[-.02em] text-[#292541]">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#77738a]">{message}</p>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <SellerButton variant="ghost" onClick={onClose} testId="confirm-cancel">{cancelLabel}</SellerButton>
            <SellerButton variant={cfg.btn} onClick={() => { onConfirm(); onClose(); }} testId="confirm-ok">{confirmLabel}</SellerButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Toggle (matches merchant Toggle) ── */
export function SellerToggle({ checked, onChange, testId }: { checked: boolean; onChange: (v: boolean) => void; testId?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      data-testid={testId}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-[#5b49e8]' : 'bg-[#dcd9e8]'}`}
    >
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${checked ? 'left-6' : 'left-1'}`} />
    </button>
  );
}

/* ── ProgressBar (matches merchant ProgressBar) ── */
export function SellerProgressBar({ value, tone = 'violet' }: { value: number; tone?: 'violet' | 'mint' | 'amber' }) {
  const colors = { violet: 'bg-[#5b49e8]', mint: 'bg-[#278e69]', amber: 'bg-[#ac741e]' };
  return (
    <div className="h-1.5 rounded-full bg-[#efedf5]">
      <div className={`h-1.5 rounded-full ${colors[tone]}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/* ── PotentialBadge (seller-specific) ── */
export function PotentialBadge({ potential }: { potential: 'Fort' | 'Bon' | 'Moyen' }) {
  const config = {
    Fort: { tone: 'mint' as const, label: 'Fort potentiel pour vous', glyph: '★' },
    Bon: { tone: 'violet' as const, label: 'Bon potentiel', glyph: '◆' },
    Moyen: { tone: 'amber' as const, label: 'Potentiel moyen', glyph: '○' },
  };
  const c = config[potential];
  return <SellerBadge tone={c.tone}>{c.glyph} {c.label}</SellerBadge>;
}
