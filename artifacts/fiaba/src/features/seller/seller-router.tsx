import { lazy, Suspense } from 'react';
import { Route, Switch } from 'wouter';
import { ProtectedRoute } from '@/components/protected-route';
import { SellerShell } from './components/seller-shell';

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

const Discover = lazyNamed(() => import('./pages/discover'), 'Discover');
const ProductDetail = lazyNamed(() => import('./pages/product-detail'), 'ProductDetail');
const SellerCampaigns = lazyNamed(() => import('./pages/campaigns'), 'SellerCampaigns');
const Share = lazyNamed(() => import('./pages/share'), 'Share');
const Sales = lazyNamed(() => import('./pages/sales'), 'Sales');
const SaleDetail = lazyNamed(() => import('./pages/sale-detail'), 'SaleDetail');
const Earnings = lazyNamed(() => import('./pages/earnings'), 'Earnings');
const EarningWithdraw = lazyNamed(() => import('./pages/earning-withdraw'), 'EarningWithdraw');
const SellerProfile = lazyNamed(() => import('./pages/profile'), 'SellerProfile');
const SellerNotifications = lazyNamed(() => import('./pages/notifications'), 'SellerNotifications');

function RouteFallback() {
  return (
    <div className="flex h-64 w-full items-center justify-center">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
    </div>
  );
}

export function SellerRouter() {
  return (
    <ProtectedRoute allowedRole="vendeur">
      <SellerShell>
        <Suspense fallback={<RouteFallback />}>
          <Switch>
            <Route path="/seller" component={Discover} />
            <Route path="/seller/product/:id" component={ProductDetail} />
            <Route path="/seller/campaigns" component={SellerCampaigns} />
            <Route path="/seller/share/:id" component={Share} />
            <Route path="/seller/sales" component={Sales} />
            <Route path="/seller/sales/:id" component={SaleDetail} />
            <Route path="/seller/earnings" component={Earnings} />
            <Route path="/seller/earnings/withdraw" component={EarningWithdraw} />
            <Route path="/seller/profile" component={SellerProfile} />
            <Route path="/seller/notifications" component={SellerNotifications} />
          </Switch>
        </Suspense>
      </SellerShell>
    </ProtectedRoute>
  );
}
