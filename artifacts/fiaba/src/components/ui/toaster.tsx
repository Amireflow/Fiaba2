import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastIcon,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';

const ERROR_KEYWORDS = ['impossible', 'invalide', 'insuffisant', 'supprimé', 'suspendu', 'bloqué', 'retiré', 'annulé', 'quittée', 'erreur', 'échec'];

function detectVariant(title: string): 'default' | 'success' | 'destructive' {
  const lower = title.toLowerCase();
  if (ERROR_KEYWORDS.some((kw) => lower.includes(kw))) return 'destructive';
  return 'success';
}

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const v = (variant ?? (typeof title === 'string' ? detectVariant(title) : 'default')) as 'default' | 'success' | 'destructive';
        return (
          <Toast key={id} variant={v} {...props}>
            <ToastIcon variant={v} />
            <div className="grid min-w-0 flex-1 gap-0.5">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
