import { lazy, Suspense } from 'react';
import { Route, Switch } from 'wouter';
import { ProtectedRoute } from '@/components/protected-route';
import { MerchantShell } from './components/merchant-shell';

const Overview = lazy(() => import('./pages/overview').then((m) => ({ default: m.Overview })));
const Products = lazy(() => import('./pages/products').then((m) => ({ default: m.Products })));
const ProductForm = lazy(() => import('./pages/product-form').then((m) => ({ default: m.ProductForm })));
const Campaigns = lazy(() => import('./pages/campaigns').then((m) => ({ default: m.Campaigns })));
const CampaignForm = lazy(() => import('./pages/campaign-form').then((m) => ({ default: m.CampaignForm })));
const Sellers = lazy(() => import('./pages/sellers').then((m) => ({ default: m.Sellers })));
const SellerDetail = lazy(() => import('./pages/seller-detail').then((m) => ({ default: m.SellerDetail })));
const Orders = lazy(() => import('./pages/orders').then((m) => ({ default: m.Orders })));
const OrderDetail = lazy(() => import('./pages/order-detail').then((m) => ({ default: m.OrderDetail })));
const Analytics = lazy(() => import('./pages/analytics').then((m) => ({ default: m.Analytics })));
const Payments = lazy(() => import('./pages/payments').then((m) => ({ default: m.Payments })));
const PaymentWithdraw = lazy(() => import('./pages/payment-withdraw').then((m) => ({ default: m.PaymentWithdraw })));
const DeliveryZones = lazy(() => import('./pages/delivery-zones').then((m) => ({ default: m.DeliveryZones })));
const DeliveryZoneNew = lazy(() => import('./pages/delivery-zone-new').then((m) => ({ default: m.DeliveryZoneNew })));
const Settings = lazy(() => import('./pages/settings').then((m) => ({ default: m.Settings })));
const Notifications = lazy(() => import('./pages/notifications').then((m) => ({ default: m.Notifications })));
const MerchantSubscriptionPage = lazy(() => import('./pages/merchant-subscription').then((m) => ({ default: m.MerchantSubscriptionPage })));

function RouteFallback() {
  return (
    <div className="flex h-64 w-full items-center justify-center">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5b49e8] border-t-transparent" />
    </div>
  );
}

export function MerchantRouter() {
  return (
    <ProtectedRoute allowedRole="marchand">
      <MerchantShell>
        <Suspense fallback={<RouteFallback />}>
          <Switch>
            <Route path="/merchant" component={Overview} />
            <Route path="/merchant/subscription" component={MerchantSubscriptionPage} />
            <Route path="/merchant/products" component={Products} />
            <Route path="/merchant/products/new" component={ProductForm} />
            <Route path="/merchant/products/:id/edit" component={ProductForm} />
            <Route path="/merchant/campaigns" component={Campaigns} />
            <Route path="/merchant/campaigns/new" component={CampaignForm} />
            <Route path="/merchant/campaigns/:id/edit" component={CampaignForm} />
            <Route path="/merchant/sellers" component={Sellers} />
            <Route path="/merchant/sellers/:id" component={SellerDetail} />
            <Route path="/merchant/orders" component={Orders} />
            <Route path="/merchant/orders/:id" component={OrderDetail} />
            <Route path="/merchant/analytics" component={Analytics} />
            <Route path="/merchant/payments" component={Payments} />
            <Route path="/merchant/payments/withdraw" component={PaymentWithdraw} />
            <Route path="/merchant/delivery-zones" component={DeliveryZones} />
            <Route path="/merchant/delivery-zones/new" component={DeliveryZoneNew} />
            <Route path="/merchant/settings" component={Settings} />
            <Route path="/merchant/notifications" component={Notifications} />
          </Switch>
        </Suspense>
      </MerchantShell>
    </ProtectedRoute>
  );
}
