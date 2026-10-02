import { CustomerDomainHub, type CustomerDomainCard } from "../components/customer-domain-hub";

const articleCards: CustomerDomainCard[] = [
  "Research progress",
  "Sources",
  "Outline",
  "Editor",
  "Claims & citations",
  "SEO checks",
  "Internal links",
  "Publication state",
].map((title) => ({ title, description: "", status: "unavailable" }));

export default function ContentPage() {
  if (location.pathname.endsWith("/articles")) {
    return (
      <CustomerDomainHub
        eyebrow="ARTICLE"
        title="Article workspace"
        description="NOT PUBLISHED. Confidence ≠ quality gate."
        cards={articleCards}
      />
    );
  }

  return (
    <CustomerDomainHub
      eyebrow="CONTENT GROWTH"
      title="Content"
      description="Research demand, gaps, and organic content."
      cards={[
        {
          title: "Search research",
          description: "Topics, gaps, demand, and evidence.",
          href: "/content/research",
          status: "preview",
        },
        {
          title: "Rank tracking",
          description: "No ranking metrics are invented.",
          href: "/content/rankings",
          status: "unavailable",
        },
        {
          title: "AI visibility",
          description: "AI-answer visibility and citations.",
          href: "/content/ai-visibility",
          status: "preview",
        },
      ]}
    />
  );
}
