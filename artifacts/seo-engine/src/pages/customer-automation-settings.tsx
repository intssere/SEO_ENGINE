import { Link } from "wouter";
import styles from "./customer-onboarding.css?inline";

const modes = [
  ["Manual", "Review recommendations and authorize each action."],
  ["Assisted", "Prepare proposals for your approval; do not execute."],
  ["Automated", "Unavailable until separate permissions and controls are verified."],
];

/** Informational preview only: no mode is persisted or activated. */
export default function CustomerAutomationSettingsPage() {
  return <div className="customerOnboarding" aria-labelledby="automation-title">
    <style>{styles}</style>
    <header className="customerOnboardingHeader">
      <div><p className="customerEyebrow">AUTOMATION SETTINGS · PREVIEW</p>
        <h1 id="automation-title">Choose how changes are managed</h1>
        <p>Website changes require verified permissions and explicit authorization.</p></div>
      <Link href="/customer-opportunities">Back to opportunities</Link>
    </header>
    <section className="customerOnboardingCard">
      <h2>Automation is not enabled</h2>
      <p role="status">No connected website, automation configuration or approval is available.</p>
    </section>
    <section aria-labelledby="automation-modes" style={{marginTop:18}}>
      <h2 id="automation-modes">Available workflows</h2>
      <div className="customerOnboardingGrid">
        <div>{modes.map(([mode,description])=>
          <article key={mode} className="customerOnboardingCard" style={{marginBottom:12}}>
            <h3>{mode}</h3><p>{description}</p><small>Not configured</small>
          </article>)}</div>
        <aside className="customerOnboardingAside">
          <h3>Safety controls</h3>
          <p>Site access, action scope, approvals, logs and rollback requirements must be verified before activation.</p>
          <p>No scheduled jobs or website writes are running in this preview.</p>
        </aside>
      </div>
    </section>
    <p className="customerNotice">Read-only preview. Choosing or saving a mode is intentionally disabled.</p>
  </div>;
}
