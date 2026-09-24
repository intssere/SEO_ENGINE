import { useEffect, useMemo, useRef, useState } from "react";
import { contextualGuideForLocation } from "../lib/contextual-onboarding-model";
import { createContextualOnboardingAdapter } from "../lib/contextual-onboarding-adapter";

export default function ContextualOnboarding({
  location,
  onClose,
}: {
  location: string;
  onClose: () => void;
}) {
  const guide = useMemo(() => contextualGuideForLocation(location), [location]);
  const [index, setIndex] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const adapter = useMemo(() => createContextualOnboardingAdapter(), []);
  const step = guide.steps[Math.min(index, guide.steps.length - 1)];

  useEffect(() => {
    setIndex(0);
  }, [guide.id]);

  useEffect(() => adapter.activate(step.selector), [adapter, step.selector]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const isLast = index === guide.steps.length - 1;

  return (
    <section
      className="contextualGuide"
      role="dialog"
      aria-modal="false"
      aria-labelledby="contextual-guide-title"
    >
      <div className="contextualGuideHead">
        <div>
          <span>{guide.label}</span>
          <strong id="contextual-guide-title">{step.title}</strong>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close guide">×</button>
      </div>
      <p aria-live="polite">{step.body}</p>
      <div className="contextualGuideFoot">
        <span>Step {index + 1} of {guide.steps.length}</span>
        <div>
          <button type="button" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0}>
            Back
          </button>
          <button
            type="button"
            onClick={() => isLast ? onClose() : setIndex((value) => Math.min(guide.steps.length - 1, value + 1))}
          >
            {isLast ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </section>
  );
}
