import customerPreviewCss from "./customer-preview-light.css?inline";
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";

const nav = [
  { href: "/home", label: "Home", icon: "⌂" },
  { href: "/onboarding", label: "Website setup", icon: "◎" },
  { href: "/analysis", label: "Site analysis", icon: "◷" },
];

/** CH-R83: Light-only, isolated read-only customer shell. No operator hooks or API calls. */
export function CustomerPreviewLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const isWelcome = location === "/home";
  return <div className={`chLightShell ${isWelcome ? "chWelcomeStandalone" : ""}`}><style>{customerPreviewCss}</style>
    <a className="skipLink" href="#main-content">Skip to main content</a>
    {!isWelcome && <aside className="chLightSidebar" aria-label="Customer workspace">
      <Link href="/home" className="chLightBrand"><span className="chLightBrandMark">✦</span><span>SEO <b>ENGINE</b><small>Customer workspace</small></span></Link>
      <p className="chLightNavLabel">WORKSPACE</p>
      <nav aria-label="Customer preview navigation">
        {nav.map(item => <Link key={item.href} href={item.href} className={`chLightNavItem ${location === item.href ? "chLightNavActive" : ""}`} aria-current={location === item.href ? "page" : undefined}><span aria-hidden="true">{item.icon}</span>{item.label}</Link>)}
      </nav>
      <div className="chLightSidebarFooter"><span className="chLightPreviewDot" /> Preview workspace <small>Read-only · No connected site</small></div>
    </aside>}
    <div className="chLightMainColumn">
      {!isWelcome && <header className="chLightTopbar"><span>Customer workspace <span aria-hidden="true">/</span> {location === "/onboarding" ? "Website setup" : location === "/analysis" ? "Site analysis" : "Home"}</span><span className="chLightMode">Preview mode</span></header>}
      <main id="main-content" tabIndex={-1} className="chLightMain"><div className="content chLightContent">{children}</div></main>
    </div>
  </div>;
}
