import "./customer-onboarding.css";
import { useState } from "react";
import { Link } from "wouter";

const platforms = ["Auto-detect", "Shopify", "WordPress", "Webflow", "Custom website"];
function siteUrl(value: string) {
  try {
    const raw = value.trim();
    if (!raw || /[\s@]/.test(raw)) return "";
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw);
    const h = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || !h.includes(".") || url.port || url.username || url.password ||
      /^(localhost|.*\.localhost|\d+(?:\.\d+){3})$/.test(h) || /\.(local|internal|test|invalid)$/.test(h)) return "";
    return "https://" + h;
  } catch { return ""; }
}
export default function CustomerOnboardingPage() {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState("Auto-detect");
  const [step, setStep] = useState(1);
  const normalized = siteUrl(url);
  return <div className="customerOnboarding">
    <header className="customerOnboardingHeader">
      <div><p className="customerEyebrow">GETTING STARTED</p><h1>Connect your website</h1>
      <p>Set up SEO ENGINE without changing your website.</p></div>
      <Link href="/home" className="customerBackLink">Back to customer home</Link>
    </header>
    <ol className="customerSteps" aria-label="Onboarding steps">
      {["Website", "Data sources", "Readiness"].map((name, i) => <li key={name} className={step === i+1 ? "current" : step > i+1 ? "completed" : ""} aria-current={step===i+1 ? "step" : undefined}><span>{step>i+1 ? "✓" : i+1}</span>{name}</li>)}
    </ol>
    <div className="customerOnboardingGrid">
      <section className="customerOnboardingCard">
        {step===1 && <>
          <h2>Which website would you like to analyze?</h2>
          <p>Enter your public website address. This preview checks format only; no site is registered or detected.</p>
          <label htmlFor="customer-website-url">Website URL</label>
          <input id="customer-website-url" placeholder="https://example.com" autoComplete="url" value={url} onChange={e=>setUrl(e.target.value)} aria-describedby="customer-url-help"/>
          <small id="customer-url-help">{url && !normalized ? "Enter a public HTTPS domain without credentials, IP address or custom port." : "Ownership verification is required for live setup."}</small>
          <label htmlFor="customer-platform">Website platform</label>
          <select id="customer-platform" value={platform} onChange={e=>setPlatform(e.target.value)}>{platforms.map(p=><option key={p}>{p}</option>)}</select>
          <button className="customerPrimaryButton" disabled={!normalized} onClick={()=>setStep(2)}>Continue →</button>
        </>}
        {step===2 && <>
          <h2>Choose your data connections</h2>
          <p>Google Search Console and GA4 are optional. This preview does not start OAuth or grant access.</p>
          {["Google Search Console", "Google Analytics 4", platform==="Auto-detect" ? "Website platform" : platform].map((name,i)=><div className="customerSource" key={i}><strong>{name}</strong><span>{i===2?"Setup required":"Optional"}</span></div>)}
          <p className="customerNotice">Permissions are granted separately. No connection is assumed.</p>
          <div className="customerButtonRow"><button className="customerSecondaryButton" onClick={()=>setStep(1)}>Back</button><button className="customerPrimaryButton" onClick={()=>setStep(3)}>Review readiness →</button></div>
        </>}
        {step===3 && <>
          <h2>Ready for verified setup</h2>
          <p>Live setup requires verified backend access.</p>
          {[["Requested website",normalized],["Platform selection",platform],["Ownership verification","Not started"],["Analysis job","Not started"]].map(([name,value])=><div className="customerReview" key={name}><span>{name}</span><strong>{value}</strong></div>)}
          <p className="customerNotice">No data has been sent, no website added, and no analysis scheduled.</p>
          <div className="customerButtonRow"><button className="customerSecondaryButton" onClick={()=>setStep(2)}>Back</button><Link href="/home" className="customerPrimaryButton">Return to customer home →</Link></div>
        </>}
      </section>
      <aside className="customerOnboardingAside">
        <h3>You're in control</h3>
        <p>Site connection does not authorize changes.</p>
        <ul><li>Read-only by default</li><li>Explicit site-level access</li><li>Evidence-backed status</li><li>No silent optimization actions</li></ul>
        <small>Integration availability depends on verified deployment and permissions.</small>
      </aside>
    </div>
  </div>;
}
