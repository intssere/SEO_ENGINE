import { useGetDashboard } from "@workspace/api-client-react";
import { Link } from "wouter";

const areas = [
  ["NEXT STEP", "Review data sources", "Check connection readiness before interpreting SEO results.", "/connections", "Review connections"],
  ["TECHNICAL SEO", "Understand coverage", "Review crawl evidence and freshness; missing data is not a clean bill of health.", "/technical-seo", "View technical SEO"],
  ["OPPORTUNITIES", "Prioritize findings", "Only persisted, evidence-backed opportunities can support a decision.", "/opportunities", "View opportunities"],
  ["PERFORMANCE", "Measure outcomes", "Use measured and comparable data; unavailable metrics remain unavailable.", "/performance", "View performance"],
] as const;

export default function CustomerHomePage() {
  const { data, isLoading, isError } = useGetDashboard();
  return <main className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-8">
    <header className="flex flex-wrap items-center justify-between gap-5">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Website workspace</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your website, clearly understood.</h1>
        <p className="max-w-2xl text-sm text-slate-600">See what is connected, what the evidence supports, and what needs attention.</p>
      </div>
      <Link href="/onboarding" className="inline-flex min-h-11 items-center rounded-lg bg-blue-700 px-5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2">Website setup</Link>
    </header>
    {isLoading ? <section role="status" className="rounded-xl border bg-white p-6">Loading website data…</section>
    : isError || !data ? <section role="alert" className="space-y-3 rounded-xl border bg-white p-6">
      <h2 className="text-xl font-bold">Website data unavailable</h2>
      <p>Current workspace evidence could not be loaded. No metrics can be confirmed.</p>
      <Link href="/" className="text-blue-700 underline">Open Command Center</Link>
    </section> : <>
      <section aria-labelledby="customer-site-heading" className="space-y-3 rounded-xl border bg-white p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Current website</p>
        <h2 id="customer-site-heading" className="text-2xl font-bold">{data.siteName}</h2>
        <p className="break-all text-slate-600">{data.domain}</p>
        <p className="text-sm text-slate-600">Workspace identity is stored. Search Console, analytics and crawl data require independent verification before metrics are shown.</p>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        {areas.map(([label, title, detail, path, action]) => <section key={path} className="space-y-3 rounded-xl border bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-700">{label}</p>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm leading-relaxed text-slate-600">{detail}</p>
          <Link href={path} className="inline-flex min-h-11 items-center font-semibold text-blue-700 underline underline-offset-4">{action} →</Link>
        </section>)}
      </div>
    </>}
    <footer className="text-sm text-slate-600"><Link href="/" className="underline">Existing Command Center</Link> · Read-only preview</footer>
  </main>;
}
