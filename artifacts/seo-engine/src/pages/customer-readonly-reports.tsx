import {Link} from "wouter";
function Preview({portfolio}:{portfolio:boolean}){return <main className="customerOnboarding"><p className="customerEyebrow">CUSTOMER · PREVIEW</p><h1>{portfolio?"Your websites":"Results and impact"}</h1><section className="customerOnboardingCard"><h2>{portfolio?"No verified websites":"Results unavailable"}</h2><p role="status">{portfolio?"No verified sites connected.":"Impact data unavailable."}</p><p>Verified data required.</p><Link href="/onboarding">Website setup</Link></section><p className="customerNotice">Preview only.</p></main>}
export function CustomerResultsImpactPage(){return <Preview portfolio={false}/>}
export function CustomerPortfolioPage(){return <Preview portfolio={true}/>}
