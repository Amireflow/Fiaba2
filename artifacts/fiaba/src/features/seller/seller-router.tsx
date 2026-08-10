import { lazy, Suspense } from 'react';
import { Route, Switch } from 'wouter';
import { ProtectedRoute } from '@/components/protected-route';
import { SellerShell } from './components/seller-shell';

const Discover = lazy(() => import('./pages/discover').then((m) => ({ default: m.Discover })));
const ProductDetail = lazy(() => import('./pages/product-detail').then((m) => ({ default: m.ProductDetail })));
const SellerCampaigns = lazy(() => import('./pages/campaigns').then((m) => ({ default: m.SellerCampaigns })));
const Share = lazy(() => import('./pages/share').then((m) => ({ default: m.Share })));
const Sales = lazy(() => import('./pages/sales').then((m) => ({ default: m.Sales })));
const SaleDetail = lazy(() => import('./pages/sale-detail').then((m) => ({ default: m.SaleDetail })));
const SellerAnalytics = lazy(() => import('./pages/analytics').then((m) => ({ default: m.SellerAnalytics })));
const Earnings = lazy(() => import('./pages/earnings').then((m) => ({ default: m.Earnings })));
const EarningWithdraw = lazy(() => import('./pages/earning-withdraw').then((m) => ({ default: m.EarningWithdraw })));
const SellerProfile = lazy(() => import('./pages/profile').then((m) => ({ default: m.SellerProfile })));
const SellerNotifications = lazy(() => import('./pages/notifications').then((m) => ({ default: m.SellerNotifications })));

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
            <Route path="/seller/analytics" component={SellerAnalytics} />
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
