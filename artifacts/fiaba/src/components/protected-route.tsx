import { type ReactNode } from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '@/hooks/use-auth';

type AllowedRole = 'marchand' | 'vendeur' | 'admin';

/**
 * Route guard that checks:
 * 1. User has an active session
 * 2. Profile completeness (routes to merchant/seller onboarding if phone/city missing)
 * 3. Role match with the requested route
 */
export function ProtectedRoute({
  children,
  allowedRole,
}: {
  children: ReactNode;
  allowedRole: AllowedRole;
}) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#f8f8fc]">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
          <p className="text-xs font-bold text-[#8b88a0]">Chargement de votre profil Fiaba…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Redirect to="/sign-in" />;
  }

  if (!profile) {
    return <Redirect to="/onboarding" />;
  }

  // Smart completeness check (except for admin)
  if (profile.role === 'vendeur' && (!profile.phone || !profile.city)) {
    return <Redirect to="/seller/onboarding" />;
  }

  if (profile.role === 'marchand' && (!profile.phone || !profile.city)) {
    return <Redirect to="/onboarding" />;
  }

  if (profile.role !== allowedRole) {
    const rolePath: Record<AllowedRole, string> = {
      marchand: '/merchant',
      vendeur: '/seller',
      admin: '/admin',
    };
    return <Redirect to={rolePath[profile.role as AllowedRole] ?? '/'} />;
  }

  return <>{children}</>;
}
