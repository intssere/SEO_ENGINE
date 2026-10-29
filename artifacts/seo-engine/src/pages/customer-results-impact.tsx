import { Link } from "wouter";

/** Read-only customer preview: never infer impact from an unverified data source. */
export default function CustomerResultsImpactPage() {
  return <div className="customerOnboarding" aria-labelledby="customer-results-title">
    <header className="customerOnboardingHeader">
      <div><p className="customerEyebrow">RESULTS &amp; IMPACT · PREVIEW</p>
        <h1 id="customer-results-title">Results and impact</h1>
        <p>Understand changes over time only after verified measurements and approved actions exist.</p></div>
      <Link className="customerBackLink" href="/site-overview">Back to site overview</Link>
    </header>
    <section className="customerOnboardingCard" aria-labelledby="customer-results-readiness">
      <h2 id="customer-results-readiness">Performance evidence is not available</h2>
      <p role="status">No verified website, baseline, measurement period or approved change is connected to this preview.</p>
      <Link className="customerPrimaryButton" href="/onboarding">Review website setup</Link>
    </section>
    <section className="customerOnboardingGrid" aria-label="Impact measurement requirements">
      <article className="customerOnboardingCard"><h2>Before and after</h2><p>Comparable verified baseline and follow-up observations are required. No results are asserted.</p></article>
      <article className="customerOnboardingCard"><h2>Attribution</h2><p>Only evidence-backed changes and measurement windows can support impact claims. No attribution is available.</p></article>
    </section>
    <p className="customerNotice">Read-only preview. No performance values, improvements or SEO activity are simulated.</p>
  </div>;
}
