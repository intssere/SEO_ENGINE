import { Link } from "wouter";
import { buildCustomerHomeView } from "./customer-home-view";

/**
 * Engineering-only customer surface. Until the authenticated site-scoped
 * capability endpoint is registered and certified, never fetch or display
 * operator dashboard data as if it belonged to this customer.
 */
export default function CustomerHomePage() {
  // No certified customer capability endpoint exists yet. Never substitute operator data.
  const view = buildCustomerHomeView(null);
  return <main className="content commandCenter">
    <header className="commandCenterHero">
      <div>
        <p className="eyebrow">CUSTOMER HOME · PREVIEW</p>
        <h1>Your website workspace</h1>
        <p className="muted">A site-specific overview will appear after membership authorization and verified evidence are available.</p>
      </div>
      <Link className="linkButton" href="/onboarding">Website setup</Link>
    </header>
    <section className="card" aria-labelledby="customer-home-status">
      <div className="commandCenterHero">
        <div>
          <p className="eyebrow">WEBSITE STATUS</p>
          <h2 id="customer-home-status">{view.kind === "unverified" ? view.heading : view.site.name}</h2>
        </div>
        <span className="muted">Status unverified</span>
      </div>
      <p className="muted">{view.kind === "unverified" ? view.description : view.reason} No metrics are inferred from the operator dashboard.</p>
      <Link className="linkButton" href="/onboarding">Review website setup</Link>
    </section>
    <div className="commandCenterWorkGrid">
      <section className="card">
        <p className="eyebrow">SEARCH DATA</p><h2>Awaiting verified sources</h2>
        <p>Search analytics and indexing data will appear only when the authorized sources and their observation times are validated.</p>
        <Link className="linkButton" href="/onboarding">Review website setup</Link>
      </section>
      <section className="card">
        <p className="eyebrow">SITE ANALYSIS</p><h2>No certified results yet</h2>
        <p>Technical findings and opportunities require independently verified site-specific evidence before they can be shown here.</p>
        <Link className="linkButton" href="/onboarding">Review website setup</Link>
      </section>
    </div>
    <footer className="commandCenterHero">
      <span>Read-only preview. Customer data is not yet enabled.</span>
      <span>Operational workspaces are separate from this customer preview.</span>
    </footer>
  </main>;
}
