import {Link} from "wouter";
export function CustomerResultsImpactPage(){return <Preview type="results"/>}
export function CustomerPortfolioPage(){return <Preview type="portfolio"/>}
function Preview({type}:{type:"results"|"portfolio"}){
const impact=type==="results";
return <div className="customerOnboarding">
<header><p className="customerEyebrow">PREVIEW · {impact?"RESULTS & IMPACT":"MULTI-SITE PORTFOLIO"}</p><h1>{impact?"Results and impact":"Your websites"}</h1></header>
<section className="customerOnboardingCard"><h2>{impact?"Results unavailable":"No verified websites"}</h2><p role="status">{impact?"No baseline, follow-up or approved change is verified.":"No connected or verified sites."}</p><p>Evidence is required before reporting.</p><Link href="/onboarding">Review website setup</Link></section>
<p className="customerNotice">Read-only preview.</p></div>
}
