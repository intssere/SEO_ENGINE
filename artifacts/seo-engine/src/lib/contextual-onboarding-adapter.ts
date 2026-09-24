export type ContextualOnboardingAdapter = {
  activate(selector: string): () => void;
};

export const CONTEXTUAL_ONBOARDING_ADAPTER = "native-dom-v1";

function firstVisible(selector: string): HTMLElement | null {
  for (const element of document.querySelectorAll(selector)) {
    if (!(element instanceof HTMLElement)) continue;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== "none" &&
      style.visibility !== "hidden"
    ) {
      return element;
    }
  }
  return null;
}

export function createContextualOnboardingAdapter(): ContextualOnboardingAdapter {
  return {
    activate(selector) {
      const target = firstVisible(selector) ?? firstVisible("#main-content");
      if (!target) return () => {};

      const previous = target.getAttribute("data-onboarding-active");
      target.setAttribute("data-onboarding-active", "true");
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: reducedMotion ? "auto" : "smooth",
      });

      return () => {
        if (previous === null) target.removeAttribute("data-onboarding-active");
        else target.setAttribute("data-onboarding-active", previous);
      };
    },
  };
}
