import { useState } from "react";
import { Link } from "wouter";
import { PageHeader } from "../components/operational-table";
import { StatusBadge } from "../components/status-badge";
import {
  normalizeWebsiteTarget,
  type WebsiteTarget,
} from "../lib/website-connection-wizard-model";

const steps = [
  "Website",
  "Platform",
  "Analysis",
  "Connection",
  "Search data",
  "Automation",
  "Review",
] as const;

type AnalysisLevel = "public" | "connected";
type ConnectionPlan = "public_only" | "shopify" | "future_connector";
type SearchPlan = "google" | "skip";
type AutomationMode = "recommend_only" | "review_required";

export default function WebsiteConnectionWizardPage() {
  const [step, setStep] = useState(0);
  const [websiteInput, setWebsiteInput] = useState("");
  const [website, setWebsite] = useState<WebsiteTarget | null>(null);
  const [urlError, setUrlError] = useState("");
  const [analysisLevel, setAnalysisLevel] = useState<AnalysisLevel>("public");
  const [connectionPlan, setConnectionPlan] = useState<ConnectionPlan>("public_only");
  const [searchPlan, setSearchPlan] = useState<SearchPlan>("google");
  const [automationMode, setAutomationMode] = useState<AutomationMode>("recommend_only");

  const next = () => {
    if (step === 0) {
      const result = normalizeWebsiteTarget(websiteInput);
      if (!result.ok) {
        setUrlError(result.error);
        return;
      }
      setWebsite(result.target);
      setUrlError("");
      setConnectionPlan(result.target.platformHint.id === "shopify" ? "shopify" : "public_only");
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const back = () => setStep((current) => Math.max(current - 1, 0));
  const platform = website?.platformHint;

  return (
    <>
      <header className="topbar">
        <div>
          <strong>Settings</strong>
          <span className="muted"> Add website</span>
        </div>
      </header>

      <div className="content">
        <PageHeader
          eyebrow="WEBSITE SETUP"
          title="Add a website"
          description="Build a safe connection plan before granting access to any provider."
        />

        <div className="grid grid-cols-1 gap-6 max-w-4xl">
          <section className="card" aria-label="Website setup progress">
            <ol className="flex flex-wrap gap-2">
              {steps.map((label, index) => (
                <li key={label} aria-current={index === step ? "step" : undefined}>
                  <StatusBadge tone={index < step ? "success" : index === step ? "info" : "neutral"}>
                    {index + 1}. {label}
                  </StatusBadge>
                </li>
              ))}
            </ol>
          </section>

          <section className="card">
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-[#172033]">Which website do you want to add?</h2>
                  <p className="text-sm text-[#647087] mt-1">
                    Enter a public website. This step validates the address only and does not contact the site.
                  </p>
                </div>
                <label className="block text-xs font-semibold text-[#455168]">
                  Website URL
                  <input
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    placeholder="https://example.com"
                    value={websiteInput}
                    onChange={(event) => setWebsiteInput(event.target.value)}
                    aria-describedby="website-url-help"
                    className="mt-1 w-full border border-[#dce2eb] rounded-md px-3 py-3 text-sm bg-white"
                  />
                </label>
                <p id="website-url-help" className="text-xs text-[#647087]">
                  Paths and query strings are reduced to the website origin for this setup plan.
                </p>
                {urlError && <p role="alert" className="text-sm text-[var(--status-danger-fg)]">{urlError}</p>}
              </div>
            )}

            {step === 1 && website && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-[#172033]">Platform hint</h2>
                  <p className="text-sm text-[#647087] mt-1">
                    This is a URL-pattern hint only. The website has not been scanned or provider-verified.
                  </p>
                </div>
                <div className="p-4 bg-[#f8fafc] border border-[#e5e9f0] rounded-lg">
                  <p className="text-xs text-[#647087]">Website</p>
                  <p className="font-bold text-[#172033] mt-1">{website.canonicalOrigin}</p>
                  <div className="flex items-center justify-between gap-4 mt-4">
                    <span className="text-sm font-semibold text-[#455168]">{platform?.label}</span>
                    <StatusBadge tone={platform?.evidence === "url_pattern_only" ? "info" : "neutral"}>
                      {platform?.evidence === "url_pattern_only" ? "PATTERN HINT" : "UNVERIFIED"}
                    </StatusBadge>
                  </div>
                </div>
                <p className="text-xs text-[#647087]">
                  Evidence-based platform detection and public-site inspection are not active in this wizard.
                </p>
              </div>
            )}

            {step === 2 && (
              <fieldset className="space-y-4">
                <legend className="text-lg font-bold text-[#172033]">Choose the analysis depth you want</legend>
                <p className="text-sm text-[#647087]">This choice describes your intended setup; it does not start analysis.</p>
                <label className="flex items-start gap-3 p-4 bg-[#f8fafc] border border-[#e5e9f0] rounded-lg">
                  <input type="radio" name="analysis-level" checked={analysisLevel === "public"} onChange={() => setAnalysisLevel("public")} />
                  <span>
                    <strong className="block text-sm text-[#172033]">Public website analysis</strong>
                    <span className="block text-xs text-[#647087] mt-1">Read-only public analysis is planned for the universal onboarding stage and is not executed here.</span>
                  </span>
                </label>
                <label className="flex items-start gap-3 p-4 bg-[#f8fafc] border border-[#e5e9f0] rounded-lg">
                  <input type="radio" name="analysis-level" checked={analysisLevel === "connected"} onChange={() => setAnalysisLevel("connected")} />
                  <span>
                    <strong className="block text-sm text-[#172033]">Connected platform + search data</strong>
                    <span className="block text-xs text-[#647087] mt-1">Use supported provider connections where available; unsupported connectors remain unavailable.</span>
                  </span>
                </label>
              </fieldset>
            )}

            {step === 3 && (
              <fieldset className="space-y-4">
                <legend className="text-lg font-bold text-[#172033]">Connection method</legend>
                <p className="text-sm text-[#647087]">Choose how you intend to connect this website. No credential is requested on this page.</p>
                <label className="flex items-start gap-3 p-4 bg-[#f8fafc] border border-[#e5e9f0] rounded-lg">
                  <input type="radio" name="connection-plan" checked={connectionPlan === "public_only"} onChange={() => setConnectionPlan("public_only")} />
                  <span>
                    <strong className="block text-sm text-[#172033]">Public website first</strong>
                    <span className="block text-xs text-[#647087] mt-1">No CMS credential. Public analysis is coming in the next onboarding stage.</span>
                  </span>
                </label>
                {platform?.id === "shopify" ? (
                  <label className="flex items-start gap-3 p-4 bg-[#f8fafc] border border-[#e5e9f0] rounded-lg">
                    <input type="radio" name="connection-plan" checked={connectionPlan === "shopify"} onChange={() => setConnectionPlan("shopify")} />
                    <span>
                      <strong className="block text-sm text-[#172033]">Existing Shopify connection</strong>
                      <span className="block text-xs text-[#647087] mt-1">Available through the current Connections screen. Authorization remains separate from this wizard.</span>
                    </span>
                  </label>
                ) : (
                  <label className="flex items-start gap-3 p-4 bg-[#f8fafc] border border-[#e5e9f0] rounded-lg">
                    <input type="radio" name="connection-plan" checked={connectionPlan === "future_connector"} onChange={() => setConnectionPlan("future_connector")} />
                    <span>
                      <strong className="block text-sm text-[#172033]">Platform connector</strong>
                      <span className="block text-xs text-[#647087] mt-1">Connector support for this platform is not active yet. Selecting it records no connection.</span>
                    </span>
                  </label>
                )}
              </fieldset>
            )}

            {step === 4 && (
              <fieldset className="space-y-4">
                <legend className="text-lg font-bold text-[#172033]">Search and analytics data</legend>
                <p className="text-sm text-[#647087]">Google authorization uses the existing secure Connections flow after you review this plan.</p>
                <label className="flex items-start gap-3 p-4 bg-[#f8fafc] border border-[#e5e9f0] rounded-lg">
                  <input type="radio" name="search-plan" checked={searchPlan === "google"} onChange={() => setSearchPlan("google")} />
                  <span>
                    <strong className="block text-sm text-[#172033]">Connect Search Console + Analytics</strong>
                    <span className="block text-xs text-[#647087] mt-1">Continue to the existing Google connection flow after this wizard.</span>
                  </span>
                </label>
                <label className="flex items-start gap-3 p-4 bg-[#f8fafc] border border-[#e5e9f0] rounded-lg">
                  <input type="radio" name="search-plan" checked={searchPlan === "skip"} onChange={() => setSearchPlan("skip")} />
                  <span>
                    <strong className="block text-sm text-[#172033]">Skip for now</strong>
                    <span className="block text-xs text-[#647087] mt-1">You can manage search-data connections later in Settings.</span>
                  </span>
                </label>
              </fieldset>
            )}

            {step === 5 && (
              <fieldset className="space-y-4">
                <legend className="text-lg font-bold text-[#172033]">Automation preference</legend>
                <p className="text-sm text-[#647087]">This is a planning preference only. It does not grant execution authority.</p>
                <label className="flex items-start gap-3 p-4 bg-[#f8fafc] border border-[#e5e9f0] rounded-lg">
                  <input type="radio" name="automation-mode" checked={automationMode === "recommend_only"} onChange={() => setAutomationMode("recommend_only")} />
                  <span>
                    <strong className="block text-sm text-[#172033]">Recommendations only</strong>
                    <span className="block text-xs text-[#647087] mt-1">Keep the setup read-only and surface recommendations for review.</span>
                  </span>
                </label>
                <label className="flex items-start gap-3 p-4 bg-[#f8fafc] border border-[#e5e9f0] rounded-lg">
                  <input type="radio" name="automation-mode" checked={automationMode === "review_required"} onChange={() => setAutomationMode("review_required")} />
                  <span>
                    <strong className="block text-sm text-[#172033]">Review before any change</strong>
                    <span className="block text-xs text-[#647087] mt-1">Describe a future review-required posture. Existing authorization safeguards remain unchanged.</span>
                  </span>
                </label>
                <div className="p-4 bg-[var(--status-neutral-bg)] border border-[var(--status-neutral-border)] rounded-lg">
                  <div className="flex items-center justify-between gap-4">
                    <strong className="text-sm text-[#455168]">Automatic live-site changes</strong>
                    <StatusBadge tone="neutral">UNAVAILABLE</StatusBadge>
                  </div>
                </div>
              </fieldset>
            )}

            {step === 6 && website && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-[#172033]">Review setup plan</h2>
                  <p className="text-sm text-[#647087] mt-1">
                    Nothing has been saved, authorized, scanned, or changed by this wizard.
                  </p>
                </div>
                <dl className="space-y-3">
                  <div className="p-4 bg-[#f8fafc] border border-[#e5e9f0] rounded-lg">
                    <dt className="text-xs text-[#647087]">Website</dt>
                    <dd className="font-bold text-[#172033] mt-1">{website.canonicalOrigin}</dd>
                  </div>
                  <div className="p-4 bg-[#f8fafc] border border-[#e5e9f0] rounded-lg">
                    <dt className="text-xs text-[#647087]">Platform</dt>
                    <dd className="font-bold text-[#172033] mt-1">{platform?.label} · unverified</dd>
                  </div>
                  <div className="p-4 bg-[#f8fafc] border border-[#e5e9f0] rounded-lg">
                    <dt className="text-xs text-[#647087]">Analysis</dt>
                    <dd className="font-bold text-[#172033] mt-1">{analysisLevel === "public" ? "Public website analysis" : "Connected platform + search data"}</dd>
                  </div>
                  <div className="p-4 bg-[#f8fafc] border border-[#e5e9f0] rounded-lg">
                    <dt className="text-xs text-[#647087]">Search data</dt>
                    <dd className="font-bold text-[#172033] mt-1">{searchPlan === "google" ? "Connect Google after review" : "Skip for now"}</dd>
                  </div>
                  <div className="p-4 bg-[#f8fafc] border border-[#e5e9f0] rounded-lg">
                    <dt className="text-xs text-[#647087]">Automation</dt>
                    <dd className="font-bold text-[#172033] mt-1">{automationMode === "recommend_only" ? "Recommendations only" : "Review required"}</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-3">
                  <Link href="/settings/connections" className="customerHubAction">Continue to Connections</Link>
                  <Link href="/settings" className="customerHubAction">Back to Settings</Link>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 mt-6">
              <button type="button" className="customerHubAction" onClick={back} disabled={step === 0}>
                Back
              </button>
              {step < steps.length - 1 && (
                <button type="button" className="customerHubAction" onClick={next}>
                  Continue
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
