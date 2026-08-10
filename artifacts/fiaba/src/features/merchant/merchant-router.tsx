import { lazy, Suspense } from 'react';
import { Route, Switch } from 'wouter';
import { ProtectedRoute } from '@/components/protected-route';
import { MerchantShell } from './components/merchant-shell';

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

const Overview = lazyNamed(() => import('./pages/overview'), 'Overview');
const Products = lazyNamed(() => import('./pages/products'), 'Products');
const ProductForm = lazyNamed(() => import('./pages/product-form'), 'ProductForm');
const Campaigns = lazyNamed(() => import('./pages/campaigns'), 'Campaigns');
const CampaignForm = lazyNamed(() => import('./pages/campaign-form'), 'CampaignForm');
const Sellers = lazyNamed(() => import('./pages/sellers'), 'Sellers');
const SellerDetail = lazyNamed(() => import('./pages/seller-detail'), 'SellerDetail');
const Orders = lazyNamed(() => import('./pages/orders'), 'Orders');
const OrderDetail = lazyNamed(() => import('./pages/order-detail'), 'OrderDetail');
const Analytics = lazyNamed(() => import('./pages/analytics'), 'Analytics');
const Payments = lazyNamed(() => import('./pages/payments'), 'Payments');
const PaymentWithdraw = lazyNamed(() => import('./pages/payment-withdraw'), 'PaymentWithdraw');
const DeliveryZones = lazyNamed(() => import('./pages/delivery-zones'), 'DeliveryZones');
const DeliveryZoneNew = lazyNamed(() => import('./pages/delivery-zone-new'), 'DeliveryZoneNew');
const Settings = lazyNamed(() => import('./pages/settings'), 'Settings');
const Notifications = lazyNamed(() => import('./pages/notifications'), 'Notifications');
const MerchantSubscriptionPage = lazyNamed(() => import('./pages/merchant-subscription'), 'MerchantSubscriptionPage');

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
