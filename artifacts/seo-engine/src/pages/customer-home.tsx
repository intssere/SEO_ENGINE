import { Link } from "wouter";
import { buildCustomerHomeView } from "./customer-home-view";
import "./customer-home.css";

/**
 * Engineering-only customer surface. Until the authenticated site-scoped
 * capability endpoint is registered and certified, never fetch or display
 * operator dashboard data as if it belonged to this customer.
 */
export default function CustomerHomePage() {
  // No certified customer capability endpoint exists yet. Never substitute operator data.
  const view = buildCustomerHomeView(null);
  return <main className="customerHome">
    <header className="customerHomeHero">
      <div>
        <p className="customerHomeEyebrow">CUSTOMER HOME · PREVIEW</p>
        <h1>Your website workspace</h1>
        <p className="customerHomeLead">A site-specific overview will appear after membership authorization and verified evidence are available.</p>
      </div>
      <Link className="customerHomePrimary" href="/onboarding">Website setup</Link>
    </header>
    <section className="customerHomePanel" aria-labelledby="customer-home-status">
      <div className="customerHomePanelHeader">
        <div>
          <p className="customerHomeEyebrow">WEBSITE STATUS</p>
          <h2 id="customer-home-status">{view.kind === "unverified" ? view.heading : view.site.name}</h2>
        </div>
        <span className="customerHomeTag">Status unverified</span>
      </div>
      <p className="customerHomeSubtle">{view.kind === "unverified" ? view.description : view.reason} No metrics are inferred from the operator dashboard.</p>
      <Link className="customerHomeTextLink" href="/onboarding">Review website setup</Link>
    </section>
    <div className="customerHomeGrid">
      <section className="customerHomePanel">
        <p className="customerHomeEyebrow">SEARCH DATA</p><h2>Awaiting verified sources</h2>
        <p>Search analytics and indexing data will appear only when the authorized sources and their observation times are validated.</p>
        <Link className="customerHomeTextLink" href="/onboarding">Review website setup</Link>
      </section>
      <section className="customerHomePanel">
        <p className="customerHomeEyebrow">SITE ANALYSIS</p><h2>No certified results yet</h2>
        <p>Technical findings and opportunities require independently verified site-specific evidence before they can be shown here.</p>
        <Link className="customerHomeTextLink" href="/onboarding">Review website setup</Link>
      </section>
    </div>
    <footer className="customerHomeFooter">
      <span>Read-only preview. Customer data is not yet enabled.</span>
      <span>Operational workspaces are separate from this customer preview.</span>
    </footer>
  </main>;
}
