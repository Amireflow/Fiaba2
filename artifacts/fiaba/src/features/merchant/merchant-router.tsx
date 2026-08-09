import { Route, Switch } from 'wouter';
import { ProtectedRoute } from '@/components/protected-route';
import { MerchantShell } from './components/merchant-shell';
import { Overview } from './pages/overview';
import { Products } from './pages/products';
import { ProductForm } from './pages/product-form';
import { Campaigns } from './pages/campaigns';
import { CampaignForm } from './pages/campaign-form';
import { Sellers } from './pages/sellers';
import { SellerDetail } from './pages/seller-detail';
import { Orders } from './pages/orders';
import { OrderDetail } from './pages/order-detail';
import { Analytics } from './pages/analytics';
import { Payments } from './pages/payments';
import { PaymentWithdraw } from './pages/payment-withdraw';
import { DeliveryZones } from './pages/delivery-zones';
import { DeliveryZoneNew } from './pages/delivery-zone-new';
import { Settings } from './pages/settings';
import { Notifications } from './pages/notifications';

export function MerchantRouter() {
  return (
    <ProtectedRoute allowedRole="marchand">
      <MerchantShell>
        <Switch>
          <Route path="/merchant" component={Overview} />
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
      </MerchantShell>
    </ProtectedRoute>
  );
}
