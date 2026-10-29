import { Link } from "wouter";
import styles from "./customer-onboarding.css?inline";

/** Preview only: no verified opportunity or authorized site change. */
export default function CustomerOpportunityDetailPage() {
  return <div className="customerOnboarding">
    <style>{styles}</style>
    <header className="customerOnboardingHeader">
      <div><p className="customerEyebrow">OPPORTUNITY DETAIL · PREVIEW</p>
        <h1>Before &amp; after</h1>
        <p>Review verified evidence before approval.</p></div>
      <Link href="/customer-opportunities">Back to opportunities</Link>
    </header>
    <p role="status">No verified opportunity selected. Comparison unavailable.</p>
    <div className="customerOnboardingGrid">
      {["Before · Current state","After · Proposed change"].map(title=>
        <section className="customerOnboardingCard" key={title}>
          <h2>{title}</h2><p>No verified evidence or approved proposal.</p>
        </section>)}
    </div>
    <section className="customerOnboardingCard">
      <h2>Impact &amp; approval</h2>
      <p>Impact unknown. No approval requested; site changes disabled.</p>
    </section>

  </div>;
}
