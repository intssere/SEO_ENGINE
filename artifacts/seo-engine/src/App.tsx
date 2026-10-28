import { lazy, Suspense, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

import { Layout } from './components/layout';
import { CustomerPreviewLayout } from './components/customer-preview-layout';
import { AuthProvider } from './lib/auth-client';
import DashboardPage from './pages/dashboard';
const CustomerOnboardingPage = lazy(() => import('./pages/customer-onboarding'));
const CustomerHomePage = lazy(() => import('./pages/customer-home'));
const CustomerAnalysisPage = lazy(() => import('./pages/customer-analysis'));
import NotFound from './pages/not-found';
import OpportunitiesPage from './pages/opportunities';
import GovernancePage from './pages/governance';
import ActionsPage from './pages/actions';
import ApprovalsPage from './pages/approvals';
import PerformancePage from './pages/performance';
import DeploymentsPage from './pages/deployments';
import TechnicalSeoPage from './pages/technical-seo';
import ConnectionsPage from './pages/connections';
import SettingsPage from './pages/settings';

// Informational pages
import RankingsPage from './pages/rankings';
import InternalLinksPage from './pages/internal-links';
import AiVisibilityPage from './pages/ai-visibility';
import ExperimentsPage from './pages/experiments';
import SearchIntelligencePage from './pages/search-intelligence';
import LearningPage from './pages/learning';
import ImpactPage from './pages/impact';
import ReportsPage from './pages/reports';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  const [location] = useLocation();
  const isCustomerPreview = location === '/home' || location === '/onboarding' || location === '/analysis';
  const Shell = isCustomerPreview ? CustomerPreviewLayout : Layout;
  return (
    <RoutedErrorBoundary>
      <Shell>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/home">{() => <Suspense fallback={<div role="status" className="content">Loading customer workspace…</div>}><CustomerHomePage /></Suspense>}</Route>
          <Route path="/onboarding">{() => <Suspense fallback={<div role="status" className="content">Loading website setup…</div>}><CustomerOnboardingPage /></Suspense>}</Route>
          <Route path="/analysis">{() => <Suspense fallback={<div role="status" className="content">Loading analysis status…</div>}><CustomerAnalysisPage /></Suspense>}</Route>
          <Route path="/opportunities" component={OpportunitiesPage} />
          <Route path="/governance" component={GovernancePage} />
          <Route path="/actions" component={ActionsPage} />
          <Route path="/approvals" component={ApprovalsPage} />
          <Route path="/performance" component={PerformancePage} />
          <Route path="/deployments" component={DeploymentsPage} />
          <Route path="/technical-seo" component={TechnicalSeoPage} />

          <Route path="/rankings" component={RankingsPage} />
          <Route path="/internal-links" component={InternalLinksPage} />
          <Route path="/ai-visibility" component={AiVisibilityPage} />
          <Route path="/experiments" component={ExperimentsPage} />
          <Route path="/search-intelligence" component={SearchIntelligencePage} />
          <Route path="/learning" component={LearningPage} />
          <Route path="/impact" component={ImpactPage} />
          <Route path="/reports" component={ReportsPage} />

          <Route path="/connections" component={ConnectionsPage} />
          <Route path="/settings" component={SettingsPage} />

          <Route component={NotFound} />
        </Switch>
      </Shell>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
    </QueryClientProvider>
  );
}

export default App;