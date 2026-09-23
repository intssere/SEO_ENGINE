import { CustomerDomainHub } from "../components/customer-domain-hub";

export default function AutomationPage() {
  return (
    <CustomerDomainHub
      eyebrow="SAFE AUTOMATION"
      title="Automation"
      description="Review changes, control automation, and inspect outcomes."
      cards={[
        {
          title: "Review changes",
          description:
            "Review proposed edits that require a decision.",
          href: "/automation/review",
          actionLabel: "Review pending changes",
          status: "available",
        },
        {
          title: "Change queue",
          description:
            "See prepared actions and the safeguards blocking execution.",
          href: "/automation/changes",
          actionLabel: "Open change queue",
          status: "available",
        },
        {
          title: "Change history",
          description:
            "Inspect recorded changes and verification state.",
          href: "/automation/history",
          actionLabel: "View change history",
          status: "available",
        },
        {
          title: "Safety & rules",
          description:
            "Inspect risk, rollback, and execution guardrails.",
          href: "/automation/safety",
          actionLabel: "Review safety controls",
          status: "available",
        },
      ]}
    />
  );
}
