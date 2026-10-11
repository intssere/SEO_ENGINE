import "./customer-onboarding.css";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Globe2, CheckCircle2, CircleHelp, LockKeyhole, Plug, ShieldCheck } from "lucide-react";

const platforms = ["Auto-detect", "Shopify", "WordPress", "Webflow", "Custom website"] as const;
type Platform = typeof platforms[number];

function parsePublicWebsite(input: string): { host: string; normalized: string } | null {
  try {
    const candidate = input.trim();
    if (!candidate || candidate.includes("@") || /\s/.test(candidate)) return null;
    const url = new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || !host.includes(".") || url.username || url.password ||
      url.port || /^(localhost|.*\.localhost)$/.test(host) || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) ||
      /\.(?:local|internal|test|invalid)$/.test(host)) return null;
    return { host, normalized: `https://${host}` };
  } catch { return null; }
}

export default function CustomerOnboardingPage() {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<Platform>("Auto-detect");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const parsed = useMemo(() => parsePublicWebsite(url), [url]);
  return (
    <div className="customerOnboarding">
      <header className="customerOnboardingHeader">
        <div><p className="customerEyebrow">GETTING STARTED</p><h1>Connect your website</h1>
        <p>Set up your SEO workspace in a few clear steps. Nothing will be changed on your website.</p></div>
        <Link href="/" className="customerBackLink">Back to Command Center</Link>
      </header>
      <ol className="customerSteps" aria-label="Onboarding steps">
        {["Website", "Data sources", "Readiness"].map((name, i) => (
          <li key={name} className={step === i+1 ? "current" : step > i+1 ? "completed" : ""} aria-current={step===i+1 ? "step" : undefined}>
            <span>{step>i+1 ? <CheckCircle2 size={17}/> : i+1}</span>{name}
          </li>
        ))}
      </ol>
      <div className="customerOnboardingGrid">
        <section className="customerOnboardingCard">
          {step===1 && <>
            <div className="customerSectionIcon"><Globe2 size={22}/></div>
            <h2>Which website would you like to analyze?</h2>
            <p>Enter your public website address. This design preview checks the address format only; it does not register a site or detect its technology.</p>
            <label htmlFor="customer-website-url">Website URL</label>
            <input id="customer-website-url" placeholder="https://example.com" autoComplete="url" value={url} onChange={e=>setUrl(e.target.value)} aria-describedby="customer-url-help"/>
            <small id="customer-url-help">{url && !parsed ? "Enter a public HTTPS domain without credentials, an IP address or a custom port." : "Example: yourstore.com — ownership checks happen in the live connection process."}</small>
            <label htmlFor="customer-platform">Website platform</label>
            <select id="customer-platform" value={platform} onChange={e=>setPlatform(e.target.value as Platform)}>
              {platforms.map(p=><option value={p} key={p}>{p}</option>)}
            </select>
            <button className="customerPrimaryButton" disabled={!parsed} onClick={()=>setStep(2)}>Continue <ArrowRight size={17}/></button>
          </>}
          {step===2 && <>
            <div className="customerSectionIcon"><Plug size={22}/></div>
            <h2>Choose your data connections</h2>
            <p>Google Search Console and Google Analytics are optional. Connecting them requires an authenticated, authorized production provider flow; this preview does not initiate OAuth.</p>
            <div className="customerSource"><span><strong>Google Search Console</strong><small>Search performance and indexed pages</small></span><span>Optional</span></div>
            <div className="customerSource"><span><strong>Google Analytics 4</strong><small>Visitor and engagement measurements</small></span><span>Optional</span></div>
            <div className="customerSource"><span><strong>{platform==="Auto-detect" ? "Website platform" : platform}</strong><small>Platform-specific access after verification</small></span><span>Setup required</span></div>
            <p className="customerNotice"><LockKeyhole size={16}/> Permissions are granted separately. No connection is assumed.</p>
            <div className="customerButtonRow"><button className="customerSecondaryButton" onClick={()=>setStep(1)}>Back</button><button className="customerPrimaryButton" onClick={()=>setStep(3)}>Review readiness <ArrowRight size={17}/></button></div>
          </>}
          {step===3 && <>
            <div className="customerSectionIcon"><ShieldCheck size={22}/></div>
            <h2>Ready for verified setup</h2>
            <p>Your selections are local to this preview. Website ownership, provider authorization and any real crawl must be completed through certified backend operations.</p>
            <div className="customerReview"><span>Requested website</span><strong>{parsed?.normalized}</strong></div>
            <div className="customerReview"><span>Platform selection</span><strong>{platform}</strong></div>
            <div className="customerReview"><span>Ownership verification</span><strong>Not started</strong></div>
            <div className="customerReview"><span>Analysis job</span><strong>Not started</strong></div>
            <p className="customerNotice"><CircleHelp size={16}/> No data has been sent, no website added, and no analysis scheduled.</p>
            <div className="customerButtonRow"><button className="customerSecondaryButton" onClick={()=>setStep(2)}>Back</button><Link href="/connections" className="customerPrimaryButton">View existing connections <ArrowRight size={17}/></Link></div>
          </>}
        </section>
        <aside className="customerOnboardingAside">
          <div className="customerAsideIcon"><ShieldCheck size={21}/></div>
          <h3>You're in control</h3>
          <p>SEO ENGINE separates site analysis from making changes. A connection never authorizes a public-site modification.</p>
          <ul><li>Read-only by default</li><li>Explicit site-level access</li><li>Evidence-backed status</li><li>No silent optimization actions</li></ul>
          <div className="customerAsideFoot">Integration availability depends on verified deployment and permissions.</div>
        </aside>
      </div>
    </div>
  );
}
