import { lazy, Suspense } from 'react';
import { Route, Switch } from 'wouter';
import { ProtectedRoute } from '@/components/protected-route';
import { AdminShell } from './components/admin-shell';

function lazyNamed<T extends Record<string, any>>(
  factory: () => Promise<T>,
  name: keyof T
) {
  return lazy(() =>
    factory().then((m) => ({
      default: m[name] || m.default || m,
    }))
  );
}

const AdminOverview = lazyNamed(() => import('./pages/overview'), 'AdminOverview');
const AdminUsers = lazyNamed(() => import('./pages/users'), 'AdminUsers');
const AdminProducts = lazyNamed(() => import('./pages/products'), 'AdminProducts');
const AdminOrders = lazyNamed(() => import('./pages/orders'), 'AdminOrders');
const AdminCommissions = lazyNamed(() => import('./pages/commissions'), 'AdminCommissions');
const AdminPayouts = lazyNamed(() => import('./pages/payouts'), 'AdminPayouts');
const AdminDisputes = lazyNamed(() => import('./pages/disputes'), 'AdminDisputes');
const AdminFraud = lazyNamed(() => import('./pages/fraud'), 'AdminFraud');
const AdminZones = lazyNamed(() => import('./pages/zones'), 'AdminZones');
const AdminZoneNew = lazyNamed(() => import('./pages/zone-new'), 'AdminZoneNew');
const AdminNiches = lazyNamed(() => import('./pages/niches'), 'AdminNiches');
const AdminNicheNew = lazyNamed(() => import('./pages/niche-new'), 'AdminNicheNew');
const AdminSettings = lazyNamed(() => import('./pages/settings'), 'AdminSettings');
const AdminNotifications = lazyNamed(() => import('./pages/notifications'), 'AdminNotifications');
const FinancialReportingPage = lazyNamed(() => import('./pages/financial-reporting'), 'FinancialReportingPage');

function RouteFallback() {
  return (
    <div className="flex h-64 w-full items-center justify-center">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
    </div>
  );
}

export function AdminRouter() {
  return (
    <ProtectedRoute allowedRole="admin">
      <AdminShell>
        <Suspense fallback={<RouteFallback />}>
          <Switch>
            <Route path="/admin" component={AdminOverview} />
            <Route path="/admin/finances" component={FinancialReportingPage} />
            <Route path="/admin/users" component={AdminUsers} />
            <Route path="/admin/products" component={AdminProducts} />
            <Route path="/admin/orders" component={AdminOrders} />
            <Route path="/admin/commissions" component={AdminCommissions} />
            <Route path="/admin/payouts" component={AdminPayouts} />
            <Route path="/admin/disputes" component={AdminDisputes} />
            <Route path="/admin/fraud" component={AdminFraud} />
            <Route path="/admin/zones" component={AdminZones} />
            <Route path="/admin/zones/new" component={AdminZoneNew} />
            <Route path="/admin/niches" component={AdminNiches} />
            <Route path="/admin/niches/new" component={AdminNicheNew} />
            <Route path="/admin/settings" component={AdminSettings} />
            <Route path="/admin/notifications" component={AdminNotifications} />
          </Switch>
        </Suspense>
      </AdminShell>
    </ProtectedRoute>
  );
}
