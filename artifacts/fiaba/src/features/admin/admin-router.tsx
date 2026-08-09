import { Route, Switch } from 'wouter';
import { AdminShell } from './components/admin-shell';
import { AdminOverview } from './pages/overview';
import { AdminUsers } from './pages/users';
import { AdminProducts } from './pages/products';
import { AdminOrders } from './pages/orders';
import { AdminCommissions } from './pages/commissions';
import { AdminPayouts } from './pages/payouts';
import { AdminDisputes } from './pages/disputes';
import { AdminFraud } from './pages/fraud';
import { AdminZones } from './pages/zones';
import { AdminZoneNew } from './pages/zone-new';
import { AdminNiches } from './pages/niches';
import { AdminNicheNew } from './pages/niche-new';
import { AdminSettings } from './pages/settings';
import { AdminNotifications } from './pages/notifications';

export function AdminRouter() {
  return (
    <AdminShell>
      <Switch>
        <Route path="/admin" component={AdminOverview} />
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
    </AdminShell>
  );
}
