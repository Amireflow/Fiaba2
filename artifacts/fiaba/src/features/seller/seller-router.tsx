import { Route, Switch } from 'wouter';
import { ProtectedRoute } from '@/components/protected-route';
import { SellerShell } from './components/seller-shell';
import { Discover } from './pages/discover';
import { ProductDetail } from './pages/product-detail';
import { SellerCampaigns } from './pages/campaigns';
import { Share } from './pages/share';
import { Sales } from './pages/sales';
import { SaleDetail } from './pages/sale-detail';
import { Earnings } from './pages/earnings';
import { EarningWithdraw } from './pages/earning-withdraw';
import { SellerProfile } from './pages/profile';
import { SellerNotifications } from './pages/notifications';

export function SellerRouter() {
  return (
    <ProtectedRoute allowedRole="vendeur">
      <SellerShell>
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
      </SellerShell>
    </ProtectedRoute>
  );
}
