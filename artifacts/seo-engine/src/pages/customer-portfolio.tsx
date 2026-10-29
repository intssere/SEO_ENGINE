import { Link } from "wouter";

/** Preview never asserts ownership, verification or management of any website. */
export default function CustomerPortfolioPage() {
  return <div className="customerOnboarding" aria-labelledby="customer-portfolio-title">
    <header className="customerOnboardingHeader">
      <div><p className="customerEyebrow">MULTI-SITE PORTFOLIO · PREVIEW</p>
        <h1 id="customer-portfolio-title">Your websites</h1>
        <p>View site-level readiness and results when website access has been verified.</p></div>
      <Link className="customerBackLink" href="/home">Back to welcome</Link>
    </header>
    <section className="customerOnboardingCard" aria-labelledby="customer-portfolio-empty">
      <h2 id="customer-portfolio-empty">No verified websites</h2>
      <p role="status">This preview has no connected sites or independently verified portfolio records.</p>
      <Link className="customerPrimaryButton" href="/onboarding">Review website setup</Link>
    </section>
    <section className="customerOnboardingGrid" aria-label="Future portfolio capabilities">
      <article className="customerOnboardingCard"><h2>Site readiness</h2><p>Connection status and analysis readiness will be shown only from verified records.</p></article>
      <article className="customerOnboardingCard"><h2>Cross-site overview</h2><p>Comparable SEO metrics require source identity, permissions and matching reporting periods.</p></article>
    </section>
    <p className="customerNotice">Read-only preview. No sites, scores, metrics or account access have been invented.</p>
  </div>;
}
