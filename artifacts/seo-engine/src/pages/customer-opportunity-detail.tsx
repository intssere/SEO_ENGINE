import { Link } from "wouter";
import styles from "./customer-onboarding.css?inline";

/** No real findings or website changes in this preview. */
export default function CustomerOpportunityDetailPage() {
  return <div className="customerOnboarding">
    <style>{styles}</style>
    <header className="customerOnboardingHeader">
      <div><p className="customerEyebrow">OPPORTUNITY DETAIL · PREVIEW</p>
        <h1>Before &amp; after</h1>
        <p>Review evidence before approving a change.</p></div>
      <Link href="/customer-opportunities">Back to opportunities</Link>
    </header>
    <section className="customerOnboardingCard">
      <h2>No verified opportunity selected</h2>
      <p role="status">Comparison unavailable. No verified finding or proposal exists.</p>
    </section>
    <div className="customerOnboardingGrid" style={{marginTop:18}}>
      <section className="customerOnboardingCard">
        <h2>Before · Current state</h2><p>Verified evidence unavailable.</p>
      </section>
      <section className="customerOnboardingCard">
        <h2>After · Proposed change</h2><p>No approved proposal exists.</p>
      </section>
    </div>
    <section className="customerOnboardingCard" style={{marginTop:18}}>
      <h2>Impact &amp; approval</h2>
      <p>Expected impact: Not assessed. Evidence: Not available.</p>
      <p>Approval: Not requested. Site changes are disabled in preview.</p>
    </section>
    <p className="customerNotice">Read-only preview. No data or site writes have been performed.</p>
  </div>;
}
