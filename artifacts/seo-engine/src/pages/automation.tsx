import { CustomerDomainHub } from "../components/customer-domain-hub";

export default function AutomationPage() {
  return (
    <CustomerDomainHub
      eyebrow="SAFE AUTOMATION"
      title="Automation"
      description="Review proposed changes, control what can run, and inspect what happened after a change. Safety checks remain in force underneath this simpler workspace."
      cards={[
        {
          title: "Review changes",
          description:
            "Review proposed edits and decide which human-review items can proceed when the underlying workflow supports approval.",
          href: "/automation/review",
          actionLabel: "Review pending changes",
          status: "available",
        },
        {
          title: "Change queue",
          description:
            "See prepared actions, their current state, and the safeguards that must be satisfied before any provider execution can occur.",
          href: "/automation/changes",
          actionLabel: "Open change queue",
          status: "available",
        },
        {
          title: "Change history",
          description:
            "Inspect recorded deployments and verification state without turning historical records into a new execution path.",
          href: "/automation/history",
          actionLabel: "View change history",
          status: "available",
        },
        {
          title: "Safety & rules",
          description:
            "Inspect review state, risk controls, rollback planning, and execution guardrails behind automated changes.",
          href: "/automation/safety",
          actionLabel: "Review safety controls",
          status: "available",
        },
      ]}
    />
  );
}
