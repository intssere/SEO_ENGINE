import { Link } from "wouter";
import { buildCustomerHomeView } from "./customer-home-view";
import type { CustomerSiteCapability } from "../lib/customer-site-capability";

/** Read-only presentation. The default route never fetches customer or operator data. */
export function CustomerHomePresentation({ capability }: { capability: CustomerSiteCapability | null }) {
  const view = buildCustomerHomeView(capability);
  const verified = view.kind === "verified";
  const reason = verified ? view.reason : view.description;
  return <div className="content commandCenter">
    <header className="commandCenterHero">
      <div>
        <p className="eyebrow">CUSTOMER HOME · {verified ? "VERIFIED" : "PREVIEW"}</p>
        <h1>Your website workspace</h1>
        <p className="muted">{verified ? "Authorized website evidence." : "Site authorization and verified evidence required."}</p>
      </div>
      <Link className="linkButton" href="/onboarding">Website setup</Link>
    </header>
    {!verified && <div className="chLightWelcome"><section className="card chLightWelcomeCard" aria-labelledby="ch-welcome"><p className="eyebrow">GETTING STARTED</p><h2 id="ch-welcome">Welcome to SEO ENGINE</h2><p className="muted">A clearer path from website connection to evidence-backed SEO improvements.</p><div className="chLightSteps">{[["Connect your website","Start with your website address and platform."],["Authorize data sources","Verified integrations require explicit permission."],["Review your first analysis","See findings only after a certified analysis is available."],["Choose what happens next","You control every future action and approval."]].map(([heading, detail], i) => <div className="chLightStep" key={heading}><span className="chLightStepNumber">{i + 1}</span><div><strong>{heading}</strong><p>{detail}</p></div></div>)}</div><Link className="linkButton chLightPrimary" href="/onboarding">Get started →</Link></section><section className="card chLightSecondaryCard" aria-label="Workspace readiness"><p className="eyebrow">YOUR WORKSPACE</p><h2>Start with a verified website</h2><p>Connect a website to prepare your workspace. Search insights, site health, and recommendations remain unavailable until authorized sources and analysis evidence are verified.</p><p><strong>No live site connected</strong></p><Link className="linkButton" href="/onboarding">Website setup →</Link></section></div>}
    {verified && <section className="card" aria-label="Verified website overview">
      <p className="eyebrow">VERIFIED CUSTOMER SITE</p>
      <h2>{view.site.name}</h2>
      <p>{view.site.domain}</p>
      <p role="status">{view.reason}</p>
      <h3>Verified sources</h3>
      <ul>{view.sources.map(s => <li key={s.name}>{s.name}: {s.status}{s.observedAt && ` · ${s.observedAt}`}</li>)}</ul>
      <h3>Verified measurements</h3>
      {view.metrics.length ? <ul>{view.metrics.map(m => <li key={`${m.source}-${m.label}`}>{m.label}: {m.value === null ? "Unavailable" : `${m.value} ${m.unit}`}</li>)}</ul> : <p>No certified measurements are available.</p>}
    </section>}
    <section className="card" aria-labelledby="customer-home-status">
      <p className="eyebrow">WEBSITE STATUS</p>
      <h2 id="customer-home-status">{verified ? view.site.name : view.heading}</h2>
      <p className="muted">{verified ? view.state.replaceAll("_", " ") : "Status unverified"}</p>
      <p>{reason}</p>
      <Link className="linkButton" href="/onboarding">Review website setup</Link>
    </section>
    <div className="commandCenterWorkGrid">
      {[
        ["SEARCH DATA", verified ? "Verified source status" : "Awaiting verified sources",
          verified ? "Source observations and certified measurements are shown above." : "Search analytics require validated site-specific sources."],
        ["SITE ANALYSIS", verified ? "Site readiness" : "No certified results yet",
          verified ? reason : "Technical findings require independently verified site evidence."],
      ].map(([label, heading, description]) => <section className="card" key={label}>
        <p className="eyebrow">{label}</p>
        <h2>{heading}</h2>
        <p>{description}</p>
        <Link className="linkButton" href="/onboarding">Review website setup</Link>
      </section>)}
    </div>
    <footer className="commandCenterHero">
      <span>{verified ? "Read-only verified customer presentation." : "Read-only preview. Customer data is not yet enabled."}</span>
    </footer>
  </div>;
}
export default function CustomerHomePage() {
  return <CustomerHomePresentation capability={null} />;
}
