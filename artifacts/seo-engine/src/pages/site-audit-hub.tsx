import { CustomerDomainHub } from "../components/customer-domain-hub";

export default function SiteAuditHubPage() {
  return (
    <CustomerDomainHub
      eyebrow="SITE HEALTH"
      title="Site Audit"
      description="Find crawl, index, metadata, and site-quality issues."
      cards={[
        {
          title: "Technical audit",
          description:
            "Review findings, severity, affected URLs, and crawl coverage.",
          href: "/site-audit/technical",
          actionLabel: "Open technical audit",
          status: "available",
        },
        {
          title: "Crawl coverage",
          description:
            "Inspect certified crawl coverage and current URL visibility.",
          href: "/site-audit/technical",
          actionLabel: "Review crawl coverage",
          status: "preview",
        },
        {
          title: "Internal links",
          description:
            "Review internal-link capability without fabricated live results.",
          href: "/site-audit/internal-links",
          actionLabel: "View internal-link status",
          status: "unavailable",
        },
      ]}
    />
  );
}
