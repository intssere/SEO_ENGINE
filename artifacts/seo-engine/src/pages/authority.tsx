import { CustomerDomainHub } from "../components/customer-domain-hub";

export default function AuthorityPage() {
  return (
    <CustomerDomainHub
      eyebrow="AUTHORITY & LINKS"
      title="Authority"
      description="Understand the external signals supporting your site, where competitors have stronger link coverage, and which authority-building opportunities deserve attention."
      cards={[
        {
          title: "Backlink gaps",
          description:
            "Inspect supplied referring-domain gap evidence and shared coverage without treating provider-native authority metrics as universally comparable.",
          href: "/authority/backlinks",
          actionLabel: "Review backlink gaps",
          status: "preview",
        },
        {
          title: "Competitor authority",
          description:
            "Compare competitor visibility, page evidence, authority signals, and observed topic gaps in the current research workspace.",
          href: "/authority/competitors",
          actionLabel: "Open competitor research",
          status: "preview",
        },
        {
          title: "Outreach",
          description:
            "Manage earned-link outreach, brand mentions, broken-link opportunities, and editorial outreach here.",
          actionLabel: "Outreach workflow is being added",
          status: "coming_soon",
        },
        {
          title: "Digital PR opportunities",
          description:
            "PR and citation opportunities will appear here as discovery and outreach connectors are added.",
          actionLabel: "Opportunity workflow is being added",
          status: "coming_soon",
        },
      ]}
    />
  );
}
