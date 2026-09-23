import { CustomerDomainHub } from "../components/customer-domain-hub";

export default function SiteAuditHubPage() {
  return (
    <CustomerDomainHub
      eyebrow="SITE HEALTH"
      title="Site Audit"
      description="Find technical issues that can limit crawling, indexing, relevance, and site quality, then inspect the evidence before taking action."
      cards={[
        {
          title: "Technical audit",
          description:
            "Review current technical findings, severity, affected URLs, evidence quality, and crawl-certification coverage.",
          href: "/site-audit/technical",
          actionLabel: "Open technical audit",
          status: "available",
        },
        {
          title: "Crawl coverage",
          description:
            "Inspect the crawl coverage currently exposed by the certified read model. Full URL inventory remains limited until its frontend read endpoint is available.",
          href: "/site-audit/technical",
          actionLabel: "Review crawl coverage",
          status: "preview",
        },
        {
          title: "Internal links",
          description:
            "Orphan detection, internal-link graph analysis, and anchor-text distribution remain visible as a capability without fabricated live results.",
          href: "/site-audit/internal-links",
          actionLabel: "View internal-link status",
          status: "unavailable",
        },
      ]}
    />
  );
}
