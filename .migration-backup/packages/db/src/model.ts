export type UUID = string;
export type ISODateTime = string;
export type JsonObject = Record<string, unknown>;

export type ConnectionProvider =
  | "shopify"
  | "google_search_console"
  | "google_analytics"
  | "openseo"
  | "bing_webmaster"
  | "github";

export type FindingSeverity = "info" | "low" | "medium" | "high" | "critical";
export type WorkflowStatus = "pending" | "active" | "completed" | "failed" | "cancelled";
export type OpportunityStatus = "new" | "accepted" | "dismissed" | "planned" | "completed";
export type RiskLevel = "auto" | "approval" | "blocked";
export type VerificationStatus = "pending" | "verified" | "failed" | "regressed";
export type ExperimentCohort = "treatment" | "control";
export type ConfidenceLevel = "low" | "medium" | "high" | "official";

export interface Organization {
  id: UUID;
  name: string;
  slug: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Site {
  id: UUID;
  organizationId: UUID;
  name: string;
  domain: string;
  canonicalOrigin: string;
  platform: string | null;
  locale: string;
  timezone: string;
  isActive: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Connection {
  id: UUID;
  siteId: UUID;
  provider: ConnectionProvider;
  externalAccountId: string | null;
  secretRef: string | null;
  scopes: string[];
  status: "pending" | "connected" | "revoked" | "error";
  metadata: JsonObject;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface CrawlRun {
  id: UUID;
  siteId: UUID;
  status: WorkflowStatus;
  startedAt: ISODateTime | null;
  completedAt: ISODateTime | null;
  seedUrl: string;
  pagesDiscovered: number;
  pagesFetched: number;
  metadata: JsonObject;
}

export interface Page {
  id: UUID;
  siteId: UUID;
  url: string;
  normalizedUrl: string;
  path: string;
  pageType: string | null;
  indexable: boolean | null;
  firstSeenAt: ISODateTime;
  lastSeenAt: ISODateTime;
}

export interface PageSnapshot {
  id: UUID;
  pageId: UUID;
  crawlRunId: UUID | null;
  observedAt: ISODateTime;
  statusCode: number | null;
  title: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  robots: string | null;
  h1: string | null;
  contentHash: string | null;
  contentText: string | null;
  structuredData: JsonObject[];
  headings: JsonObject[];
  links: JsonObject[];
  images: JsonObject[];
  rawSignals: JsonObject;
}

export interface SearchQuery {
  id: UUID;
  siteId: UUID;
  query: string;
  country: string | null;
  device: string | null;
  firstSeenAt: ISODateTime;
  lastSeenAt: ISODateTime;
}

export interface SearchMetric {
  id: UUID;
  queryId: UUID;
  pageId: UUID | null;
  metricDate: string;
  source: string;
  impressions: number;
  clicks: number;
  ctr: number;
  averagePosition: number | null;
}

export interface Evidence {
  id: UUID;
  siteId: UUID;
  pageId: UUID | null;
  source: string;
  kind: string;
  observedAt: ISODateTime;
  confidence: number;
  payload: JsonObject;
  provenance: JsonObject;
}

export interface Finding {
  id: UUID;
  siteId: UUID;
  pageId: UUID | null;
  primaryEvidenceId: UUID | null;
  ruleId: string;
  category: string;
  severity: FindingSeverity;
  status: "open" | "resolved" | "ignored";
  title: string;
  description: string;
  detectedAt: ISODateTime;
  resolvedAt: ISODateTime | null;
}

export interface Opportunity {
  id: UUID;
  siteId: UUID;
  pageId: UUID | null;
  queryId: UUID | null;
  opportunityType: string;
  status: OpportunityStatus;
  score: number;
  impactEstimate: JsonObject;
  effortEstimate: JsonObject;
  rationale: string;
  evidenceIds: UUID[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface ActionPlan {
  id: UUID;
  siteId: UUID;
  opportunityId: UUID | null;
  status: WorkflowStatus;
  riskLevel: RiskLevel;
  rationale: string;
  expectedOutcome: JsonObject;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Action {
  id: UUID;
  actionPlanId: UUID;
  pageId: UUID | null;
  actionType: string;
  status: WorkflowStatus;
  target: JsonObject;
  proposedChange: JsonObject;
  expectedState: JsonObject;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Approval {
  id: UUID;
  actionPlanId: UUID;
  decision: "approved" | "rejected";
  actorId: string;
  reason: string | null;
  decidedAt: ISODateTime;
}

export interface Deployment {
  id: UUID;
  actionPlanId: UUID;
  provider: string;
  status: WorkflowStatus;
  externalRef: string | null;
  deployedAt: ISODateTime | null;
  metadata: JsonObject;
}

export interface Verification {
  id: UUID;
  deploymentId: UUID;
  pageId: UUID | null;
  status: VerificationStatus;
  expectedState: JsonObject;
  actualState: JsonObject;
  verifiedAt: ISODateTime | null;
}

export interface Experiment {
  id: UUID;
  siteId: UUID;
  name: string;
  hypothesis: string;
  status: WorkflowStatus;
  startedAt: ISODateTime | null;
  endedAt: ISODateTime | null;
  metadata: JsonObject;
}

export interface PolicyChange {
  id: UUID;
  sourceId: UUID;
  versionId: UUID;
  changeType: string;
  confidence: ConfidenceLevel;
  summary: string;
  impact: JsonObject;
  detectedAt: ISODateTime;
}

export interface AIResponse {
  id: UUID;
  aiQueryId: UUID;
  provider: string;
  modelFamily: string;
  modelVersion: string | null;
  observedAt: ISODateTime;
  answerText: string;
  brandMentioned: boolean;
  metadata: JsonObject;
}

export interface LearningSignal {
  id: UUID;
  siteId: UUID;
  experimentId: UUID | null;
  signalType: string;
  metric: string;
  value: number | null;
  confidence: number;
  context: JsonObject;
  observedAt: ISODateTime;
}
