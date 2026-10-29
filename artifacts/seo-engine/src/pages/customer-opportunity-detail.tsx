import { Link } from "wouter";
import styles from "./customer-onboarding.css?inline";

/** Read-only empty state: never invent a finding or enable an approval. */
export default function CustomerOpportunityDetailPage() {
  return <div className="customerOnboarding" aria-labelledby="detail-title">
    <style>{styles}</style>
    <header className="customerOnboardingHeader">
      <div><p className="customerEyebrow">OPPORTUNITY DETAIL · PREVIEW</p>
        <h1 id="detail-title">Before &amp; after</h1>
        <p>Review evidence and the proposed change before taking action.</p></div>
      <Link href="/customer-opportunities" className="customerBackLink">Back to opportunities</Link>
    </header>
    <section className="customerOnboardingCard" aria-labelledby="detail-status">
      <p className="customerEyebrow">NO VERIFIED OPPORTUNITY SELECTED</p>
      <h2 id="detail-status">Comparison unavailable</h2>
      <p role="status">No verified finding, affected URL or authorized proposal is available in this preview.</p>
    </section>
    <div className="customerOnboardingGrid" style={{marginTop:18}}>
      <section className="customerOnboardingCard" aria-label="Before">
        <h2>Before · Current state</h2><p>Awaiting a verified observation and supporting evidence.</p>
      </section>
      <section className="customerOnboardingCard" aria-label="After">
        <h2>After · Proposed change</h2><p>No proposed modification has been reviewed or approved.</p>
      </section>
    </div>
    <section className="customerOnboardingCard" style={{marginTop:18}} aria-label="Impact and approval">
      <h2>Impact &amp; approval</h2>
      <p>Expected impact: Not assessed. Evidence: Not available.</p>
      <p>Approval status: Not requested. No website change can run from this preview.</p>
      <Link href="/customer-opportunities" className="customerBackLink">Return to opportunity queue →</Link>
    </section>
    <p className="customerNotice">Read-only illustration of the review process. No data, recommendation, approval or site write has been generated.</p>
  </div>;
}
