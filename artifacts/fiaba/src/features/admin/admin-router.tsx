import { lazy, Suspense } from 'react';
import { Route, Switch } from 'wouter';
import { ProtectedRoute } from '@/components/protected-route';
import { AdminShell } from './components/admin-shell';

const AdminOverview = lazy(() => import('./pages/overview').then((m) => ({ default: m.AdminOverview })));
const AdminUsers = lazy(() => import('./pages/users').then((m) => ({ default: m.AdminUsers })));
const AdminProducts = lazy(() => import('./pages/products').then((m) => ({ default: m.AdminProducts })));
const AdminOrders = lazy(() => import('./pages/orders').then((m) => ({ default: m.AdminOrders })));
const AdminCommissions = lazy(() => import('./pages/commissions').then((m) => ({ default: m.AdminCommissions })));
const AdminPayouts = lazy(() => import('./pages/payouts').then((m) => ({ default: m.AdminPayouts })));
const AdminDisputes = lazy(() => import('./pages/disputes').then((m) => ({ default: m.AdminDisputes })));
const AdminFraud = lazy(() => import('./pages/fraud').then((m) => ({ default: m.AdminFraud })));
const AdminZones = lazy(() => import('./pages/zones').then((m) => ({ default: m.AdminZones })));
const AdminZoneNew = lazy(() => import('./pages/zone-new').then((m) => ({ default: m.AdminZoneNew })));
const AdminNiches = lazy(() => import('./pages/niches').then((m) => ({ default: m.AdminNiches })));
const AdminNicheNew = lazy(() => import('./pages/niche-new').then((m) => ({ default: m.AdminNicheNew })));
const AdminSettings = lazy(() => import('./pages/settings').then((m) => ({ default: m.AdminSettings })));
const AdminNotifications = lazy(() => import('./pages/notifications').then((m) => ({ default: m.AdminNotifications })));
const FinancialReportingPage = lazy(() => import('./pages/financial-reporting').then((m) => ({ default: m.FinancialReportingPage })));

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
