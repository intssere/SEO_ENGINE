import {
  lazy,
  Suspense,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
} from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart3,
  FileText,
  House,
  Lightbulb,
  Link2,
  SearchCheck,
  Settings2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { AskModal } from "./ask-modal";
import { useGetDashboard } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-client";
import navigation from "@/navigation.json";

const ContextualOnboarding = lazy(() => import("./contextual-onboarding"));

export const AskModalContext = createContext<(open: boolean) => void>(() => {});
export const useAskModal = () => useContext(AskModalContext);

type NavigationItem = {
  label: string;
  path: string;
  aliases?: string[];
};

const NAV_ITEMS = navigation as NavigationItem[];

const NAV_ICON_BY_PATH: Record<string, LucideIcon> = {
  "/": House,
  "/opportunities": Lightbulb,
  "/content": FileText,
  "/site-audit": SearchCheck,
  "/authority": Link2,
  "/automation": Sparkles,
  "/performance": BarChart3,
  "/settings": Settings2,
};

const ADVANCED_DETAIL_ROUTES = new Set([
  "/site-audit/technical",
  "/automation/changes",
  "/automation/history",
  "/automation/safety",
  "/performance/experiments",
  "/performance/learning",
  "/settings/connections",
]);

function isNavigationItemActive(item: NavigationItem, location: string) {
  if (location === item.path) return true;
  if (item.path !== "/" && location.startsWith(item.path + "/")) return true;
  return item.aliases?.includes(location) ?? false;
}

function PrimaryNavigation({
  location,
  approvalsPending,
  onNavigate,
}: {
  location: string;
  approvalsPending?: number;
  onNavigate?: () => void;
}) {
  return (
    <nav className="primaryNav" aria-label="Primary navigation">
      <ul className="navList">
        {NAV_ITEMS.map((item) => {
          const isActive = isNavigationItemActive(item, location);
          const Icon = NAV_ICON_BY_PATH[item.path] ?? House;
          const pending =
            item.path === "/automation" && approvalsPending
              ? approvalsPending
              : 0;

          return (
            <li key={item.path}>
              <Link
                href={item.path}
                className={isActive ? "active" : ""}
                aria-current={isActive ? "page" : undefined}
                onClick={onNavigate}
              >
                <Icon className="navIcon" aria-hidden="true" />
                <span className="navLinkText">
                  {item.label}
                  {pending ? ` · ${pending}` : ""}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data, isLoading } = useGetDashboard();
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const askReturnFocusRef = useRef<HTMLElement | null>(null);
  const guideReturnFocusRef = useRef<HTMLElement | null>(null);
  const mobileNavToggleRef = useRef<HTMLButtonElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);
  const previousLocationRef = useRef(location);
  const auth = useAuth();
  const detailParent = NAV_ITEMS.find(
    (item) => item.path !== "/" && location.startsWith(item.path + "/"),
  );

  const setAskModalOpen = useCallback((open: boolean) => {
    if (open) {
      const active = document.activeElement;
      askReturnFocusRef.current =
        active instanceof HTMLElement ? active : null;
      setIsAskModalOpen(true);
      return;
    }

    setIsAskModalOpen(false);
    const returnTarget = askReturnFocusRef.current;
    askReturnFocusRef.current = null;
    window.requestAnimationFrame(() => returnTarget?.focus());
  }, []);

  const setGuideOpen = useCallback((open: boolean) => {
    if (open) {
      const active = document.activeElement;
      guideReturnFocusRef.current = active instanceof HTMLElement ? active : null;
      setIsMobileNavOpen(false);
      setIsGuideOpen(true);
      return;
    }
    setIsGuideOpen(false);
    const returnTarget = guideReturnFocusRef.current;
    guideReturnFocusRef.current = null;
    window.requestAnimationFrame(() => returnTarget?.focus());
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setAskModalOpen(true);
        return;
      }
      if (e.key === "Escape" && isMobileNavOpen) {
        setIsMobileNavOpen(false);
        window.requestAnimationFrame(() => mobileNavToggleRef.current?.focus());
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileNavOpen, setAskModalOpen]);

  useEffect(() => {
    setIsMobileNavOpen(false);
    const locationChanged = previousLocationRef.current !== location;
    previousLocationRef.current = location;
    if (locationChanged) {
      window.requestAnimationFrame(() => {
        mainContentRef.current?.focus({ preventScroll: true });
      });
    }

    const activeItem = NAV_ITEMS.find((item) =>
      isNavigationItemActive(item, location),
    );
    if (activeItem) {
      document.title = `${activeItem.label} | SEO Engine`;
    }
  }, [location]);

  return (
    <AskModalContext.Provider value={setAskModalOpen}>
      <div className="shell">
        <a className="skipLink" href="#main-content">Skip to main content</a>
        <aside className="sidebar">
          <div className="brand">
            <span className="brandMark" aria-hidden="true">S</span>
            <div>
              <strong>SEO ENGINE</strong>
              <small>Search Growth Platform</small>
            </div>
          </div>

          <PrimaryNavigation
            location={location}
            approvalsPending={data?.approvalsPending}
          />

          <div className="sidebarFoot">
            <button type="button" className="onboardingGuideButton" onClick={() => setGuideOpen(true)}>
              Guide this page
            </button>
            {auth.enforcementEnabled && auth.authenticated && auth.user ? (
              <div className="mb-3 border-b border-[#24344f] pb-3 text-xs leading-5 text-[#9fb0c9]">
                <strong className="block truncate text-[#dce6f4]">
                  {auth.user.displayName || auth.user.email}
                </strong>
                <span className="block truncate">{auth.user.email}</span>
                <span className="uppercase tracking-wide">{auth.user.role}</span>
                <button
                  type="button"
                  className="mt-2 rounded border border-[#334766] px-2 py-1 text-[#dce6f4] hover:bg-[#17253a]"
                  onClick={() => void auth.logout()}
                >
                  Sign out
                </button>
              </div>
            ) : null}
            {isLoading ? (
              <span className="text-[#7f91af]">Loading workspace...</span>
            ) : data ? (
              <>
                <span
                  aria-hidden="true"
                  className={`statusDot ${data.state === "live" ? "" : "offline"}`}
                />
                {data.state === "live" ? "Workspace online" : "Data unavailable"}
                <br />
                <small>Safety controls active</small>
              </>
            ) : (
              <span className="text-[#7f91af]">Offline</span>
            )}
          </div>
        </aside>

        <div className="mobileNav">
          <div className="mobileNavBar">
            <div className="mobileBrand">
              <span className="brandMark" aria-hidden="true">S</span>
              <div>
                <strong>SEO ENGINE</strong>
                <small>Search workspace</small>
              </div>
            </div>
            <div className="mobileNavActions">
              <button type="button" className="mobileNavToggle" onClick={() => setGuideOpen(true)}>
                Guide this page
              </button>
              <button
              ref={mobileNavToggleRef}
              type="button"
              className="mobileNavToggle"
              aria-expanded={isMobileNavOpen}
              aria-controls="mobile-primary-navigation"
              aria-label={isMobileNavOpen ? "Close navigation" : "Open navigation"}
              onClick={() => setIsMobileNavOpen((open) => !open)}
            >
              {isMobileNavOpen ? "Close" : "Menu"}
              </button>
            </div>
          </div>
          <div
            id="mobile-primary-navigation"
            className="mobileNavPanel"
            hidden={!isMobileNavOpen}
          >
            <PrimaryNavigation
              location={location}
              approvalsPending={data?.approvalsPending}
              onNavigate={() => setIsMobileNavOpen(false)}
            />
          </div>
        </div>

        <main
          id="main-content"
          ref={mainContentRef}
          tabIndex={-1}
          className="workspace relative"
        >
          {detailParent ? (
            <div className="detailViewBanner" role="note">
              <span>
                {ADVANCED_DETAIL_ROUTES.has(location)
                  ? "ADVANCED VIEW"
                  : "EVIDENCE VIEW"}
              </span>
              <strong>{detailParent.label} details</strong>
              <Link href={detailParent.path}>Back to {detailParent.label}</Link>
            </div>
          ) : null}
          {children}
        </main>

        {isGuideOpen ? (
          <Suspense fallback={null}>
            <ContextualOnboarding location={location} onClose={() => setGuideOpen(false)} />
          </Suspense>
        ) : null}
        <AskModal open={isAskModalOpen} onOpenChange={setAskModalOpen} />
      </div>
    </AskModalContext.Provider>
  );
}
