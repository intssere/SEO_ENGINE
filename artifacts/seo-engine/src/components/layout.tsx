import { type ReactNode, useEffect, useState, createContext, useContext } from "react";
import { Link, useLocation } from "wouter";
import { AskModal } from "./ask-modal";
import { useGetDashboard } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-client";

export const AskModalContext = createContext<(open: boolean) => void>(() => {});
export const useAskModal = () => useContext(AskModalContext);

const NAV_ITEMS = [
  { label: "Overview", path: "/" },
  { label: "Opportunities", path: "/opportunities" },
  { label: "Actions", path: "/actions" },
  { label: "Approvals", path: "/approvals" },
  { label: "Performance", path: "/performance" },
  { label: "Rankings", path: "/rankings" },
  { label: "Technical SEO", path: "/technical-seo" },
  { label: "Internal Links", path: "/internal-links" },
  { label: "AI Visibility", path: "/ai-visibility" },
  { label: "Experiments", path: "/experiments" },
  { label: "Search Intelligence", path: "/search-intelligence" },
  { label: "Learning", path: "/learning" },
  { label: "Deployments", path: "/deployments" },
  { label: "Impact", path: "/impact" },
  { label: "Connections", path: "/connections" },
  { label: "Settings", path: "/settings" },
];

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
          <nav>
            {NAV_ITEMS.map((item) => {
              const isActive = location === item.path;
              return (
                <Link key={item.path} href={item.path} className={isActive ? "active" : ""}>
                  {item.label}
                  {item.label === "Approvals" && data?.approvalsPending ? ` · ${data.approvalsPending}` : ""}
                </Link>
              );
            })}
          </nav>
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

        <section className="workspace relative">
          {children}
        </section>

        <AskModal open={isAskModalOpen} onOpenChange={setIsAskModalOpen} />
      </main>
    </AskModalContext.Provider>
  );
}
