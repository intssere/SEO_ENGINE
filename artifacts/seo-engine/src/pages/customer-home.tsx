import { Link } from "wouter";
import { buildCustomerHomeView } from "./customer-home-view";
import type { CustomerSiteCapability } from "../lib/customer-site-capability";

/**
 * Engineering-only customer surface. Until the authenticated site-scoped
 * capability endpoint is registered and certified, never fetch or display
 * operator dashboard data as if it belonged to this customer.
 */
export function CustomerHomePresentation({ capability }: { capability: CustomerSiteCapability | null }) {
  const view = buildCustomerHomeView(capability);
  return <main className="content commandCenter">
    <header className="commandCenterHero">
      <div>
        <p className="eyebrow">CUSTOMER HOME · PREVIEW</p>
        <h1>Your website workspace</h1>
        <p className="muted">A site-specific overview will appear after membership authorization and verified evidence are available.</p>
      </div>
      <Link className="linkButton" style={{ color: "#244dc1" }} href="/onboarding">Website setup</Link>
    </header>
    {view.kind === "verified" ? <section className="card" aria-label="Verified website overview">
      <p className="eyebrow">VERIFIED CUSTOMER SITE</p>
      <h2>{view.site.name}</h2>
      <p className="muted">{view.site.domain}</p>
      <p role="status">{view.reason}</p>
      <h3>Verified sources</h3>
      <ul>{view.sources.map(source => <li key={source.name}>{source.name}: {source.status}{source.observedAt ? ` · ${source.observedAt}` : ""}</li>)}</ul>
      <h3>Verified measurements</h3>
      {view.metrics.length ? <ul>{view.metrics.map(metric => <li key={`${metric.source}-${metric.label}`}>
        {metric.label}: {metric.value === null ? "Unavailable" : `${metric.value} ${metric.unit}`}
      </li>)}</ul> : <p>No certified measurements are available.</p>}
    </section> : null}
    <section className="card" aria-labelledby="customer-home-status">
      <div className="commandCenterHero">
        <div>
          <p className="eyebrow">WEBSITE STATUS</p>
          <h2 id="customer-home-status">{view.kind === "unverified" ? view.heading : view.site.name}</h2>
        </div>
        <span className="muted">{view.kind === "verified" ? view.state.replaceAll("_", " ") : "Status unverified"}</span>
      </div>
      <p className="muted">{view.kind === "unverified" ? view.description : view.reason} No metrics are inferred from the operator dashboard.</p>
      <Link className="linkButton" href="/onboarding">Review website setup</Link>
    </section>
    <div className="commandCenterWorkGrid">
      <section className="card">
        <p className="eyebrow">SEARCH DATA</p><h2>{view.kind === "verified" ? "Verified source status" : "Awaiting verified sources"}</h2>
        <p>{view.kind === "verified" ? "Source observations are shown above. Detailed search measurements remain unavailable until separately certified." : "Search analytics and indexing data will appear only when the authorized sources and their observation times are validated."}</p>
        <Link className="linkButton" href="/onboarding">Review website setup</Link>
      </section>
      <section className="card">
        <p className="eyebrow">SITE ANALYSIS</p><h2>{view.kind === "verified" ? "Site readiness" : "No certified results yet"}</h2>
        <p>{view.kind === "verified" ? view.reason : "Technical findings and opportunities require independently verified site-specific evidence before they can be shown here."}</p>
        <Link className="linkButton" href="/onboarding">Review website setup</Link>
      </section>
    </div>
    <footer className="commandCenterHero">
      <span>{view.kind === "verified" ? "Read-only verified customer presentation." : "Read-only preview. Customer data is not yet enabled."}</span>
      <span>Operational workspaces are separate from this customer preview.</span>
    </footer>
  </main>;
}

export default function CustomerHomePage() {
  // No certified customer endpoint is registered; this route remains unverified.
  return <CustomerHomePresentation capability={null} />;
}
