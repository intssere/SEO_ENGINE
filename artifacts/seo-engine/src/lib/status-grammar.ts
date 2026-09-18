export type StatusTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

function normalized(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function riskTone(value: string | null | undefined): StatusTone {
  switch (normalized(value)) {
    case "low":
    case "safe":
      return "success";
    case "medium":
    case "approval":
      return "warning";
    case "high":
    case "critical":
    case "blocked":
      return "danger";
    default:
      return "neutral";
  }
}

export function lifecycleTone(value: string | null | undefined): StatusTone {
  switch (normalized(value)) {
    case "approved_proposal":
    case "completed":
    case "deployed":
      return "success";
    case "approval_ready":
    case "pending":
      return "warning";
    case "invalidated":
    case "rejected":
    case "failed":
      return "danger";
    case "generated":
    case "draft":
      return "info";
    default:
      return "neutral";
  }
}

export function qualityTone(value: string | null | undefined): StatusTone {
  switch (normalized(value)) {
    case "pass":
      return "success";
    case "warning":
      return "warning";
    case "fail":
    case "failed":
    case "blocked":
      return "danger";
    default:
      return "neutral";
  }
}

export function availabilityTone(value: string | null | undefined): StatusTone {
  switch (normalized(value)) {
    case "read_only":
      return "info";
    case "coming_soon":
    case "planned":
      return "neutral";
    case "unavailable":
      return "danger";
    default:
      return "neutral";
  }
}

export function readinessTone(value: string | null | undefined): StatusTone {
  switch (normalized(value)) {
    case "live":
    case "ready":
    case "pilot_ready":
    case "certified":
      return "success";
    case "setup_required":
    case "pending":
    case "stale":
      return "warning";
    case "unavailable":
    case "offline":
    case "failed":
      return "danger";
    default:
      return "neutral";
  }
}

export function connectionTone(
  connected: boolean,
  authorized = false,
): StatusTone {
  if (connected) return "success";
  if (authorized) return "warning";
  return "neutral";
}

export function decisionTone(value: string | null | undefined): StatusTone {
  switch (normalized(value)) {
    case "approved":
      return "success";
    case "rejected":
      return "danger";
    case "pending":
    case "":
      return "neutral";
    default:
      return "info";
  }
}
