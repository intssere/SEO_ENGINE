import { type ReactNode, useEffect, useState, createContext, useContext } from "react";
import { Link, useLocation } from "wouter";
import { AskModal } from "./ask-modal";
import { useGetDashboard } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-client";
import navigation from "@/navigation.json";

export const AskModalContext = createContext<(open: boolean) => void>(() => {});
export const useAskModal = () => useContext(AskModalContext);

type NavigationItem = {
  label: string;
  path: string;
  status?: "planned";
};

type NavigationDomain = {
  domain: string;
  items: NavigationItem[];
};

const NAV_DOMAINS = navigation as NavigationDomain[];
const NAV_ITEMS = NAV_DOMAINS.flatMap((domain) => domain.items);

function navigationDomainId(domain: string) {
  return `nav-domain-${domain.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function NavigationGroups({
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
      {NAV_DOMAINS.map((domain) => {
        const domainId = navigationDomainId(domain.domain);
        return (
          <div className="navDomain" key={domain.domain} aria-labelledby={domainId}>
            <p className="navDomainLabel" id={domainId}>{domain.domain}</p>
            <div className="navDomainItems">
              {domain.items.map((item) => {
                const isActive = location === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={isActive ? "active" : ""}
                    aria-current={isActive ? "page" : undefined}
                    onClick={onNavigate}
                  >
                    <span className="navLinkText">
                      {item.label}
                      {item.label === "Approvals" && approvalsPending ? ` · ${approvalsPending}` : ""}
                    </span>
                    {item.status === "planned" ? <span className="navStatus">Planned</span> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function riskTone(risk: string) {
  if (risk === "approval") return "approval";
  if (risk === "blocked") return "experiment";
  return "verified";
}

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data, isLoading } = useGetDashboard();
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const auth = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsAskModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    setIsMobileNavOpen(false);
    const activeItem = NAV_ITEMS.find((item) => item.path === location);
    if (activeItem) {
      document.title = `${activeItem.label} | SEO Engine`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute("content", `View ${activeItem.label} on SEO Engine, your AI command center.`);
      }
    }
  }, [location]);

  return (
    <AskModalContext.Provider value={setIsAskModalOpen}>
      <main className="shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brandMark">S</span>
            <div>
              <strong>SEO ENGINE</strong>
              <small>AI SEO Command Center</small>
            </div>
          </div>

          <NavigationGroups
            location={location}
            approvalsPending={data?.approvalsPending}
          />

          <div className="sidebarFoot">
            {auth.enforcementEnabled && auth.authenticated && auth.user ? (
              <div className="mb-3 border-b border-[#24344f] pb-3 text-xs leading-5 text-[#9fb0c9]">
                <strong className="block truncate text-[#dce6f4]">{auth.user.displayName || auth.user.email}</strong>
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
              <span className="text-[#7f91af]">Loading state...</span>
            ) : data ? (
              <>
                <span className={`statusDot ${data.state === "live" ? "" : "offline"}`} />
                {data.state === "live" ? "Engine online" : "Data unavailable"}
                <br />
                <small>Guarded autonomy</small>
              </>
            ) : (
              <span className="text-[#7f91af]">Offline</span>
            )}
          </div>
        </aside>

        <div className="mobileNav">
          <div className="mobileNavBar">
            <div className="mobileBrand">
              <span className="brandMark">S</span>
              <div>
                <strong>SEO ENGINE</strong>
                <small>Navigation</small>
              </div>
            </div>
            <button
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
          <div
            id="mobile-primary-navigation"
            className="mobileNavPanel"
            hidden={!isMobileNavOpen}
          >
            <NavigationGroups
              location={location}
              approvalsPending={data?.approvalsPending}
              onNavigate={() => setIsMobileNavOpen(false)}
            />
          </div>
        </div>

        <section className="workspace relative">
          {children}
        </section>

        <AskModal open={isAskModalOpen} onOpenChange={setIsAskModalOpen} />
      </main>
    </AskModalContext.Provider>
  );
}
