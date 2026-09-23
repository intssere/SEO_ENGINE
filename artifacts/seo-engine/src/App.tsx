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
import { AuthProvider } from './lib/auth-client';
import DashboardPage from './pages/dashboard';
import NotFound from './pages/not-found';
import OpportunitiesPage from './pages/opportunities';
import ContentPage from './pages/content';
import SiteAuditHubPage from './pages/site-audit-hub';
import AuthorityPage from './pages/authority';
import AutomationPage from './pages/automation';
import GovernancePage from './pages/governance';
import ActionsPage from './pages/actions';
import ApprovalsPage from './pages/approvals';
import PerformancePage from './pages/performance';
import DeploymentsPage from './pages/deployments';
import TechnicalSeoPage from './pages/technical-seo';
import ConnectionsPage from './pages/connections';
import SettingsPage from './pages/settings';

// Advanced and compatibility surfaces remain mounted behind customer domains.
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
  return (
    <RoutedErrorBoundary>
      <Layout>
        <Switch>
          {/* Customer-facing primary product domains. */}
          <Route path="/" component={DashboardPage} />
          <Route path="/opportunities" component={OpportunitiesPage} />
          <Route path="/content" component={ContentPage} />
          <Route path="/site-audit" component={SiteAuditHubPage} />
          <Route path="/authority" component={AuthorityPage} />
          <Route path="/automation" component={AutomationPage} />
          <Route path="/performance" component={PerformancePage} />
          <Route path="/settings" component={SettingsPage} />

          {/* Customer-friendly routes into existing advanced capabilities. */}
          <Route path="/content/research" component={SearchIntelligencePage} />
          <Route path="/content/rankings" component={RankingsPage} />
          <Route path="/content/ai-visibility" component={AiVisibilityPage} />

          <Route path="/site-audit/technical" component={TechnicalSeoPage} />
          <Route path="/site-audit/internal-links" component={InternalLinksPage} />

          <Route path="/authority/backlinks" component={SearchIntelligencePage} />
          <Route path="/authority/competitors" component={SearchIntelligencePage} />

          <Route path="/automation/review" component={ApprovalsPage} />
          <Route path="/automation/changes" component={ActionsPage} />
          <Route path="/automation/history" component={DeploymentsPage} />
          <Route path="/automation/safety" component={GovernancePage} />

          <Route path="/performance/impact" component={ImpactPage} />
          <Route path="/performance/reports" component={ReportsPage} />
          <Route path="/performance/experiments" component={ExperimentsPage} />
          <Route path="/performance/learning" component={LearningPage} />

          <Route path="/settings/connections" component={ConnectionsPage} />

          {/* Legacy/engineering URLs remain mounted for compatibility and certification. */}
          <Route path="/governance" component={GovernancePage} />
          <Route path="/actions" component={ActionsPage} />
          <Route path="/approvals" component={ApprovalsPage} />
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
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
