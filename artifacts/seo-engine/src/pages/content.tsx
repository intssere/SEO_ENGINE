import { CustomerDomainHub, type CustomerDomainCard } from "../components/customer-domain-hub";

const articleCards: CustomerDomainCard[] =
  "Research|Sources|Outline|Editor|Claims & citations|SEO|Links|Publication"
    .split("|")
    .map((title) => ({ title, description: "", status: "unavailable" }));

export default function ContentPage() {
  if (location.pathname.endsWith("/articles")) {
    return (
      <CustomerDomainHub
        eyebrow="CONTENT"
        title="Article workspace"
        description="NOT PUBLISHED. Confidence ≠ gate."
        cards={articleCards}
      />
    );
  }

  return (
    <CustomerDomainHub
      eyebrow="CONTENT GROWTH"
      title="Content"
      description="Research and content."
      cards={[
        {
          title: "Search research",
          description: "Topics and evidence.",
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
          description: "AI visibility.",
          href: "/content/ai-visibility",
          status: "preview",
        },
      ]}
    />
  );
}
