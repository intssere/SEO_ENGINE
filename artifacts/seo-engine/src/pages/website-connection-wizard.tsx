import { useState } from "react";
import { Link } from "wouter";
import { PageHeader } from "../components/operational-table";
import { StatusBadge } from "../components/status-badge";
import { normalizeWebsiteTarget, type WebsiteTarget } from "../lib/website-connection-wizard-model";

const steps = ["Website", "Platform", "Analysis", "Connection", "Search data", "Automation", "Review"] as const;
const box = "p-4 bg-[#f8fafc] border border-[#e5e9f0] rounded-lg";
const note = "block text-xs text-[#647087] mt-1";
const choice = "flex items-start gap-3 " + box;

type ChoiceProps = {
  name: string;
  value: string;
  current: string;
  set: (value: any) => void;
  title: string;
  detail: string;
};

function Choice({ name, value, current, set, title, detail }: ChoiceProps) {
  return (
    <label className={choice}>
      <input type="radio" name={name} checked={current === value} onChange={() => set(value)} />
      <span>
        <strong className="block text-sm text-[#172033]">{title}</strong>
        <span className={note}>{detail}</span>
      </span>
    </label>
  );
}

function StepIntro({ title, detail }: { title: string; detail: string }) {
  return (
    <>
      <legend className="text-lg font-bold text-[#172033]">{title}</legend>
      <p className="text-sm text-[#647087]">{detail}</p>
    </>
  );
}

export default function WebsiteConnectionWizardPage() {
  const [step, setStep] = useState(0);
  const [websiteInput, setWebsiteInput] = useState("");
  const [website, setWebsite] = useState<WebsiteTarget | null>(null);
  const [urlError, setUrlError] = useState("");
  const [analysisLevel, setAnalysisLevel] = useState("public");
  const [connectionPlan, setConnectionPlan] = useState("public_only");
  const [searchPlan, setSearchPlan] = useState("google");
  const [automationMode, setAutomationMode] = useState("recommend_only");
  const platform = website?.platformHint;

  const next = () => {
    if (!step) {
      const result = normalizeWebsiteTarget(websiteInput);
      if (!result.ok) return setUrlError(result.error);
      setWebsite(result.target);
      setUrlError("");
      setConnectionPlan(result.target.platformHint.id === "shopify" ? "shopify" : "public_only");
    }
    setStep((value) => Math.min(value + 1, 6));
  };

  const review = website ? [
    ["Website", website.canonicalOrigin],
    ["Platform", platform?.label + " · unverified"],
    ["Public web checks", "Planned · not run"],
    ["Analysis", analysisLevel === "public" ? "Public website analysis" : "Connected platform + search data"],
    ["Search data", searchPlan === "google" ? "Connect Google after review" : "Skip for now"],
    ["Automation", automationMode === "recommend_only" ? "Recommendations only" : "Review required"],
  ] : [];

  return (
    <>
      <header className="topbar"><div><strong>Settings</strong><span className="muted"> Add website</span></div></header>
      <div className="content">
        <PageHeader eyebrow="WEBSITE SETUP" title="Add a website" description="Build a safe connection plan before granting access to any provider." />
        <div className="grid grid-cols-1 gap-6 max-w-4xl">
          <section className="card" aria-label="Website setup progress">
            <ol className="flex flex-wrap gap-2">
              {steps.map((label, index) => (
                <li key={label} aria-current={index === step ? "step" : undefined}>
                  <StatusBadge tone={index < step ? "success" : index === step ? "info" : "neutral"}>{index + 1}. {label}</StatusBadge>
                </li>
              ))}
            </ol>
          </section>

          <section className="card">
            {step === 0 && <div className="space-y-4">
              <div><h2 className="text-lg font-bold text-[#172033]">Which website do you want to add?</h2>
                <p className="text-sm text-[#647087] mt-1">Enter a public website. This validates the address only and does not contact the site.</p></div>
              <label className="block text-xs font-semibold text-[#455168]">Website URL
                <input type="url" inputMode="url" autoComplete="url" placeholder="https://example.com" value={websiteInput}
                  onChange={(event) => setWebsiteInput(event.target.value)} aria-describedby="website-url-help"
                  className="mt-1 w-full border border-[#dce2eb] rounded-md px-3 py-3 text-sm bg-white" />
              </label>
              <p id="website-url-help" className="text-xs text-[#647087]">Paths and query strings are reduced to the website origin.</p>
              {urlError && <p role="alert" className="text-sm text-[var(--status-danger-fg)]">{urlError}</p>}
            </div>}

            {step === 1 && website && <div className="space-y-4">
              <div><h2 className="text-lg font-bold text-[#172033]">Platform hint</h2>
                <p className="text-sm text-[#647087] mt-1">This is a URL-pattern hint only. The website has not been scanned or provider-verified.</p></div>
              <div className={box}><p className="text-xs text-[#647087]">Website</p><p className="font-bold text-[#172033] mt-1">{website.canonicalOrigin}</p>
                <div className="flex items-center justify-between gap-4 mt-4"><span className="text-sm font-semibold text-[#455168]">{platform?.label}</span>
                  <StatusBadge tone={platform?.evidence === "url_pattern_only" ? "info" : "neutral"}>{platform?.evidence === "url_pattern_only" ? "PATTERN HINT" : "UNVERIFIED"}</StatusBadge></div>
              </div>
              <section className={box} aria-labelledby="public-web-onboarding-title">
                <div className="flex items-center justify-between gap-4">
                  <strong id="public-web-onboarding-title" className="text-sm text-[#455168]">Public web onboarding</strong>
                  <StatusBadge tone="neutral">NOT RUN</StatusBadge>
                </div>
                <p className="text-xs text-[#647087] mt-2">Before any read-only analysis, each request and redirect hop must pass public-address and scope checks.</p>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  {website.publicWebOnboarding.checks.map((check) => (
                    <div key={check.id} className="flex items-center justify-between gap-3 border border-[#e5e9f0] rounded-md bg-white px-3 py-2">
                      <dt className="text-xs font-semibold text-[#455168]">{check.label}</dt>
                      <dd><StatusBadge tone="neutral">PENDING</StatusBadge></dd>
                    </div>
                  ))}
                </dl>
                <p className="text-xs text-[#647087] mt-3">The final analysis origin must resolve to HTTPS. No DNS lookup, redirect request, robots request, or sitemap request has run here.</p>
              </section>
              <p className="text-xs text-[#647087]">Platform detection remains unverified until evidence is collected in a later read-only analysis stage.</p>
            </div>}

            {step === 2 && <fieldset className="space-y-4">
              <StepIntro title="Choose analysis depth" detail="This describes your intended setup; it does not start analysis." />
              <Choice name="analysis" value="public" current={analysisLevel} set={setAnalysisLevel} title="Public website analysis" detail="Read-only analysis becomes eligible only after the public-web checks pass; it is not executed here." />
              <Choice name="analysis" value="connected" current={analysisLevel} set={setAnalysisLevel} title="Connected platform + search data" detail="Use supported connections where available; unsupported connectors remain unavailable." />
            </fieldset>}

            {step === 3 && <fieldset className="space-y-4">
              <StepIntro title="Connection method" detail="Choose an intended connection path. No credential is requested here." />
              <Choice name="connection" value="public_only" current={connectionPlan} set={setConnectionPlan} title="Public website first" detail="No CMS credential. Public analysis comes in the next onboarding stage." />
              {platform?.id === "shopify"
                ? <Choice name="connection" value="shopify" current={connectionPlan} set={setConnectionPlan} title="Existing Shopify connection" detail="Available through Connections; authorization remains separate from this wizard." />
                : <Choice name="connection" value="future_connector" current={connectionPlan} set={setConnectionPlan} title="Platform connector" detail="This connector is not active yet. Selecting it records no connection." />}
            </fieldset>}

            {step === 4 && <fieldset className="space-y-4">
              <StepIntro title="Search and analytics data" detail="Google authorization uses the existing Connections flow after review." />
              <Choice name="search" value="google" current={searchPlan} set={setSearchPlan} title="Connect Search Console + Analytics" detail="Continue to the existing Google connection flow after this wizard." />
              <Choice name="search" value="skip" current={searchPlan} set={setSearchPlan} title="Skip for now" detail="Manage search-data connections later in Settings." />
            </fieldset>}

            {step === 5 && <fieldset className="space-y-4">
              <StepIntro title="Automation preference" detail="This is a planning preference only. It does not grant execution authority." />
              <Choice name="automation" value="recommend_only" current={automationMode} set={setAutomationMode} title="Recommendations only" detail="Keep setup read-only and surface recommendations for review." />
              <Choice name="automation" value="review_required" current={automationMode} set={setAutomationMode} title="Review before any change" detail="Existing authorization safeguards remain unchanged." />
              <div className={box}><div className="flex items-center justify-between gap-4"><strong className="text-sm text-[#455168]">Automatic live-site changes</strong><StatusBadge tone="neutral">UNAVAILABLE</StatusBadge></div></div>
            </fieldset>}

            {step === 6 && website && <div className="space-y-4">
              <div><h2 className="text-lg font-bold text-[#172033]">Review setup plan</h2>
                <p className="text-sm text-[#647087] mt-1">Nothing has been saved, authorized, scanned, or changed by this wizard.</p></div>
              <dl className="space-y-3">{review.map(([label, value]) => <div className={box} key={label}><dt className="text-xs text-[#647087]">{label}</dt><dd className="font-bold text-[#172033] mt-1">{value}</dd></div>)}</dl>
              <div className="flex flex-wrap gap-3"><Link href="/settings/connections" className="customerHubAction">Continue to Connections</Link><Link href="/settings" className="customerHubAction">Back to Settings</Link></div>
            </div>}

            <div className="flex items-center justify-between gap-3 mt-6">
              <button type="button" className="customerHubAction" onClick={() => setStep((value) => Math.max(value - 1, 0))} disabled={!step}>Back</button>
              {step < 6 && <button type="button" className="customerHubAction" onClick={next}>Continue</button>}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
