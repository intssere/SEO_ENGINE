import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

import { Layout } from './components/layout';
import DashboardPage from './pages/dashboard';
import NotFound from './pages/not-found';
import OpportunitiesPage from './pages/opportunities';
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <RoutedErrorBoundary>
      <Layout>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/opportunities" component={OpportunitiesPage} />
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

          <Route path="/connections" component={ConnectionsPage} />
          <Route path="/settings" component={SettingsPage} />

          <Route component={NotFound} />
        </Switch>
      </Layout>
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
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
