import * as React from 'react';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Cancel01Icon, CheckmarkCircle02Icon, AlertCircleIcon, InformationCircleIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/shared/icon';

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'fixed top-0 left-1/2 z-[100] flex max-h-screen w-full max-w-[400px] -translate-x-1/2 flex-col-reverse gap-2 p-4 sm:bottom-0 sm:left-auto sm:right-0 sm:top-auto sm:translate-x-0 sm:flex-col',
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-2xl p-4 pr-10 shadow-sm transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
  {
    variants: {
      variant: {
        default: 'bg-[#fbfaff] text-[#292541]',
        success: 'bg-[#fbfaff] text-[#292541]',
        destructive: 'bg-[#fbfaff] text-[#292541]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      'inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-[#f0eff5] px-3 text-xs font-bold text-[#514b71] transition hover:bg-[#e8e6f0]',
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg text-[#9290a2] transition hover:bg-[#f0eff5] hover:text-[#292541] focus:outline-none',
      className,
    )}
    toast-close=""
    {...props}
  >
    <Icon glyph={Cancel01Icon} size={16} />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn('font-[Space_Grotesk] text-sm font-bold tracking-[-.01em] text-[#292541]', className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('text-xs leading-5 text-[#77738a]', className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

const toastIconConfig = {
  default: { icon: InformationCircleIcon, bg: 'bg-[#efedff]', color: 'text-[#5b49e8]' },
  success: { icon: CheckmarkCircle02Icon, bg: 'bg-[#e7faf2]', color: 'text-[#278e69]' },
  destructive: { icon: AlertCircleIcon, bg: 'bg-[#fff0f1]', color: 'text-[#c45667]' },
};

function ToastIcon({ variant }: { variant: 'default' | 'success' | 'destructive' }) {
  const cfg = toastIconConfig[variant];
  return (
    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${cfg.bg} ${cfg.color}`}>
      <Icon glyph={cfg.icon} size={18} strokeWidth={2} />
    </span>
  );
}

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  ToastIcon,
};
