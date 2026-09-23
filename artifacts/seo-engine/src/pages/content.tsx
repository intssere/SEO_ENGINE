import { CustomerDomainHub } from "../components/customer-domain-hub";

export default function ContentPage() {
  return (
    <CustomerDomainHub
      eyebrow="CONTENT GROWTH"
      title="Content"
      description="Research demand, find content gaps, and manage organic content."
      cards={[
        {
          title: "Search research",
          description:
            "Explore topics, gaps, demand signals, and supporting evidence.",
          href: "/content/research",
          actionLabel: "Open search research",
          status: "preview",
        },
        {
          title: "Rank tracking",
          description:
            "Check rank tracking availability. No ranking metrics are invented without a live source.",
          href: "/content/rankings",
          actionLabel: "View rank tracking",
          status: "unavailable",
        },
        {
          title: "AI visibility",
          description:
            "Inspect AI-answer visibility and citation observations.",
          href: "/content/ai-visibility",
          actionLabel: "Open AI visibility",
          status: "preview",
        },
        {
          title: "Article automation",
          description:
            "Plan, draft, optimize, and publish articles from one workflow.",
          actionLabel: "Article automation is coming",
          status: "coming_soon",
        },
      ]}
    />
  );
}
