import { Link } from "wouter";
import { buildCustomerHomeView } from "./customer-home-view";
import type { CustomerSiteCapability } from "../lib/customer-site-capability";

/** Read-only presentation. The default route never fetches customer or operator data. */
export function CustomerHomePresentation({ capability }: { capability: CustomerSiteCapability | null }) {
  const view = buildCustomerHomeView(capability);
  const verified = view.kind === "verified";
  const reason = verified ? view.reason : view.description;
  return <div className="content commandCenter">
    {verified && <header className="commandCenterHero">
      <div>
        <p className="eyebrow">CUSTOMER HOME · {verified ? "VERIFIED" : "PREVIEW"}</p>
        <h1>Your website workspace</h1>
        <p className="muted">{verified ? "Authorized website evidence." : "Site authorization and verified evidence required."}</p>
      </div>
      <Link className="linkButton" href="/onboarding">Website setup</Link>
    </header>}
    {!verified && <div className="chStandaloneWelcome"><div className="chStandaloneBrand"><span className="chStandaloneMark">✦</span> SEO <strong>ENGINE</strong><span className="chStandaloneTag">A simpler way to grow</span></div><section className="chStandalonePanel" aria-labelledby="ch-welcome"><div className="chStandaloneIntro"><p className="eyebrow">YOUR SEO JOURNEY STARTS HERE</p><h2 id="ch-welcome">Welcome to SEO ENGINE</h2><p>Higher rankings. More traffic. Real results — starting with your website.</p><div className="chLightSteps">{[["Connect your website","Shopify, WordPress, or any public website."],["Connect Google (optional)","Search Console and Analytics, with your permission."],["Run your first analysis","Your findings appear only after a verified analysis."],["Review your opportunities","Choose what to improve and approve each action."]].map(([heading, detail],i)=><div className="chLightStep" key={heading}><span className="chLightStepNumber">{i+1}</span><div><strong>{heading}</strong><p>{detail}</p></div></div>)}</div><Link className="linkButton chLightPrimary" href="/onboarding">Get started →</Link></div><div className="chStandaloneIllustration" aria-hidden="true"><div className="chIllustrationWindow"><div className="chIllustrationDots">● ● ●</div><div className="chIllustrationBars"><i/><i/><i/><i/><i/></div><div className="chIllustrationLine">↗</div></div><div className="chPlatformPills"><span>Shopify</span><span>WordPress</span><span>Any website</span></div><p>One place to understand and improve your website.</p></div></section><p className="chStandaloneFoot">You're in control. Changes require authorization and verified evidence.</p></div>}
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
    {verified && <section className="card" aria-labelledby="customer-home-status">
      <p className="eyebrow">WEBSITE STATUS</p>
      <h2 id="customer-home-status">{view.site.name}</h2>
      <p className="muted">{verified ? view.state.replaceAll("_", " ") : "Status unverified"}</p>
      <p>{reason}</p>
      <Link className="linkButton" href="/onboarding">Review website setup</Link>
    </section>}
    {verified && <div className="commandCenterWorkGrid">
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
    </div>}
    {verified && <footer className="commandCenterHero">
      <span>{verified ? "Read-only verified customer presentation." : "Read-only preview. Customer data is not yet enabled."}</span>
    </footer>}
  </div>;
}
export default function CustomerHomePage() {
  return <CustomerHomePresentation capability={null} />;
}
