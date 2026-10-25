import type { ReactNode } from "react";
import { Link } from "wouter";

/** Isolated read-only customer preview shell: no operator data hooks or action controls. */
export function CustomerPreviewLayout({ children }: { children: ReactNode }) {
  return <div className="shell customerShell">
    <a className="skipLink" href="#main-content">Skip to main content</a>
    <header className="customerPreviewHeader">
      <strong>SEO ENGINE</strong>
      <nav aria-label="Customer preview navigation">
        <Link href="/home">Home</Link>
        <Link href="/onboarding">Website setup</Link>
      </nav>
    </header>
    <main id="main-content" tabIndex={-1} className="workspace relative">{children}</main>
  </div>;
}
