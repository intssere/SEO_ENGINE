import { CustomerDomainHub } from "../components/customer-domain-hub";

export default function ContentPage() {
  return (
    <CustomerDomainHub
      eyebrow="CONTENT GROWTH"
      title="Content"
      description="Research what people search for, understand where your content is missing coverage, and manage the content workflows that support organic growth."
      cards={[
        {
          title: "Search research",
          description:
            "Explore competitor topics, semantic gaps, search demand signals, and supporting evidence before deciding what to create or improve.",
          href: "/content/research",
          actionLabel: "Open search research",
          status: "preview",
        },
        {
          title: "Rank tracking",
          description:
            "Review the current availability of keyword position and SERP monitoring. No ranking metrics are invented when a live source is not connected.",
          href: "/content/rankings",
          actionLabel: "View rank tracking",
          status: "unavailable",
        },
        {
          title: "AI visibility",
          description:
            "Inspect the current AI-answer visibility workspace and citation observations while live collection remains safely disabled.",
          href: "/content/ai-visibility",
          actionLabel: "Open AI visibility",
          status: "preview",
        },
        {
          title: "Article automation",
          description:
            "Plan, draft, optimize, and publish articles from one automated workflow.",
          actionLabel: "Article automation is coming",
          status: "coming_soon",
        },
      ]}
    />
  );
}
