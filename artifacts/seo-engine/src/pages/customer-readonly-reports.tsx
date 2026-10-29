import {Link} from "wouter";
function Preview({portfolio}:{portfolio:boolean}){return <main className="customerOnboarding"><p className="customerEyebrow">CUSTOMER · PREVIEW</p><h1>{portfolio?"Your websites":"Results and impact"}</h1><section className="customerOnboardingCard"><h2>{portfolio?"No verified websites":"Results unavailable"}</h2><p role="status">{portfolio?"No verified sites connected.":"No verified baseline or impact data."}</p><p>Evidence required before reporting.</p><Link href="/onboarding">Review website setup</Link></section><p className="customerNotice">Read-only preview.</p></main>}
export function CustomerResultsImpactPage(){return <Preview portfolio={false}/>}
export function CustomerPortfolioPage(){return <Preview portfolio={true}/>}
