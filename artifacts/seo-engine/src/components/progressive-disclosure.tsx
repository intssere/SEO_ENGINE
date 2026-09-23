import type { ReactNode } from "react";

export function ProgressiveDisclosure({
  customer,
  evidence,
  advanced,
  evidenceLabel = "Show evidence",
  advancedLabel = "Show technical details",
}: {
  customer: ReactNode;
  evidence: ReactNode;
  advanced: ReactNode;
  evidenceLabel?: string;
  advancedLabel?: string;
}) {
  return (
    <div className="progressiveDisclosure">
      <section data-disclosure-level="customer">{customer}</section>
      <details className="progressiveDisclosureLevel">
        <summary>{evidenceLabel}</summary>
        <div data-disclosure-level="evidence">
          {evidence}
          <details className="progressiveDisclosureLevel progressiveDisclosureLevel--advanced">
            <summary>{advancedLabel}</summary>
            <div data-disclosure-level="advanced">{advanced}</div>
          </details>
        </div>
      </details>
    </div>
  );
}
