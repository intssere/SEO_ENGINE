export type ContextualGuideStep = {
  id: string;
  title: string;
  body: string;
  selector: string;
};

export type ContextualGuide = {
  id: string;
  label: string;
  steps: readonly ContextualGuideStep[];
};

const navigationStep: ContextualGuideStep = {
  id: "navigation",
  title: "Move between workspaces",
  body: "Use the main navigation to switch between opportunities, content, site health, authority, automation, performance, and settings.",
  selector: ".primaryNav",
};

const domainGuide = (id: string, label: string): ContextualGuide => ({
  id,
  label,
  steps: [
    navigationStep,
    {
      id: "overview",
      title: `${label} overview`,
      body: "Start with the plain-language summary. Evidence and advanced views remain available when you need more detail.",
      selector: ".customerHubHero",
    },
    {
      id: "tools",
      title: `${label} tools`,
      body: "Each card states whether a capability is available, preview-only, unavailable, or coming next before you open it.",
      selector: ".customerHubGrid",
    },
  ],
});

const guides: Record<string, ContextualGuide> = {
  "/": {
    id: "home",
    label: "Home guide",
    steps: [
      navigationStep,
      {
        id: "overview",
        title: "Search growth overview",
        body: "This summary shows the current search-growth picture without changing your site.",
        selector: ".commandCenterHero",
      },
      {
        id: "states",
        title: "Current operating states",
        body: "These cards separate data readiness, site health, opportunity state, and automation state so missing evidence is visible.",
        selector: ".commandCenterStatusGrid",
      },
    ],
  },
  "/opportunities": {
    id: "opportunities",
    label: "Opportunities guide",
    steps: [
      navigationStep,
      {
        id: "queue",
        title: "What to improve next",
        body: "Recommendations stay evidence-backed and keep impact, risk, review state, and measurement state separate.",
        selector: ".opportunityQueue",
      },
      {
        id: "decision-cards",
        title: "Review before action",
        body: "Open evidence when needed. A recommendation or approval does not by itself authorize execution.",
        selector: ".approvalReviewList",
      },
    ],
  },
  "/content": domainGuide("content", "Content"),
  "/site-audit": domainGuide("site-audit", "Site Audit"),
  "/authority": domainGuide("authority", "Authority"),
  "/automation": domainGuide("automation", "Automation"),
  "/performance": {
    id: "performance",
    label: "Performance guide",
    steps: [
      navigationStep,
      {
        id: "filters",
        title: "Choose the view",
        body: "Use the reporting controls to change the time window, country, and device without changing source data.",
        selector: ".topbar .filters",
      },
      {
        id: "results",
        title: "Read measured outcomes",
        body: "Performance rows are shown from the available source state; unavailable evidence is not replaced with generated metrics.",
        selector: ".content .card",
      },
    ],
  },
  "/settings": {
    id: "settings",
    label: "Settings guide",
    steps: [
      navigationStep,
      {
        id: "websites",
        title: "Add or manage websites",
        body: "Start website setup here. Connecting a source does not automatically grant live-site write access.",
        selector: "[data-onboarding-target='settings-websites']",
      },
      {
        id: "safety",
        title: "Keep safeguards visible",
        body: "Automation safeguards remain separate from connection setup and clearly show what is protected or inactive.",
        selector: "[data-onboarding-target='settings-safety']",
      },
    ],
  },
  "/settings/add-website": {
    id: "website-wizard",
    label: "Website setup guide",
    steps: [
      {
        id: "progress",
        title: "Follow the setup stages",
        body: "The wizard builds a connection plan step by step. It does not scan, authorize, or change the site by itself.",
        selector: "[aria-label='Website setup progress']",
      },
      {
        id: "website",
        title: "Start with the public website",
        body: "Enter a public URL. Platform identification in this wizard is only a URL-pattern hint until evidence-based detection is available.",
        selector: "input[placeholder='https://example.com']",
      },
    ],
  },
};

const advancedGuide: ContextualGuide = {
  id: "detail-view",
  label: "Detail view guide",
  steps: [
    {
      id: "level",
      title: "Know the detail level",
      body: "This banner tells you whether you are in an evidence or advanced view and provides a direct path back to the customer-facing workspace.",
      selector: ".detailViewBanner",
    },
    {
      id: "workspace",
      title: "Inspect the detail",
      body: "Use this view for evidence or technical inspection. It does not change authorization or execution state.",
      selector: "#main-content",
    },
  ],
};

const fallbackGuide: ContextualGuide = {
  id: "workspace",
  label: "Workspace guide",
  steps: [
    navigationStep,
    {
      id: "workspace",
      title: "Current workspace",
      body: "Use this page to inspect the available information. Missing or unavailable source data remains explicitly unavailable.",
      selector: "#main-content",
    },
  ],
};

export function contextualGuideForLocation(location: string): ContextualGuide {
  if (guides[location]) return guides[location];

  const parent = ["/content", "/site-audit", "/authority", "/automation", "/performance", "/settings"]
    .find((path) => location.startsWith(path + "/"));

  if (parent && location !== "/settings/add-website") return advancedGuide;
  return fallbackGuide;
}
