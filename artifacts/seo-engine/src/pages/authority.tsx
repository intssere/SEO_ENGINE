import { CustomerDomainHub } from "../components/customer-domain-hub";

export default function AuthorityPage() {
  return (
    <CustomerDomainHub
      eyebrow="AUTHORITY & LINKS"
      title="Authority"
      description="Find backlink gaps and authority-building opportunities."
      cards={[
        {
          title: "Backlink gaps",
          description:
            "Inspect referring-domain gaps and shared coverage evidence.",
          href: "/authority/backlinks",
          actionLabel: "Review backlink gaps",
          status: "preview",
        },
        {
          title: "Competitor authority",
          description:
            "Compare competitor visibility, authority signals, and topic gaps.",
          href: "/authority/competitors",
          actionLabel: "Open competitor research",
          status: "preview",
        },
        {
          title: "Outreach",
          description:
            "Manage earned-link, mention, broken-link, and editorial outreach.",
          actionLabel: "Outreach workflow is being added",
          status: "coming_soon",
        },
        {
          title: "Digital PR opportunities",
          description:
            "PR and citation opportunities will appear as connectors are added.",
          actionLabel: "Opportunity workflow is being added",
          status: "coming_soon",
        },
      ]}
    />
  );
}
