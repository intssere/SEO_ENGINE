import { Link } from 'wouter';

export default function NotFound() {
  return (
    <section className="content" aria-labelledby="not-found-title">
      <div className="card">
        <h1 id="not-found-title">Page not found</h1>
        <p className="muted">This address is not available in your workspace.</p>
        <Link href="/">Return to Command Center</Link>
      </div>
    </section>
  );
}
