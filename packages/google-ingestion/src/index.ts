export const GSC_READONLY_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
export const GA4_READONLY_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface GscSearchRow {
  date: string | null;
  query: string | null;
  page: string | null;
  country: string | null;
  device: string | null;
  clicks: number;
  impressions: number;
  ctr: number;
  averagePosition: number;
}

interface GscApiRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

interface GscApiResponse {
  rows?: GscApiRow[];
}

export interface GscQueryOptions extends DateRange {
  siteUrl: string;
  accessToken: string;
  rowLimit?: number;
  startRow?: number;
  fetchImpl?: typeof fetch;
}

export function normalizeGscRows(rows: GscApiRow[] = []): GscSearchRow[] {
  return rows.map((row) => {
    const keys = row.keys ?? [];
    return {
      date: keys[0] ?? null,
      query: keys[1] ?? null,
      page: keys[2] ?? null,
      country: keys[3] ?? null,
      device: keys[4] ?? null,
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      averagePosition: row.position ?? 0,
    };
  });
}

export async function fetchGscSearchAnalytics(options: GscQueryOptions): Promise<GscSearchRow[]> {
  const fetcher = options.fetchImpl ?? fetch;
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(options.siteUrl)}/searchAnalytics/query`;
  const response = await fetcher(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${options.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      startDate: options.startDate,
      endDate: options.endDate,
      dimensions: ["date", "query", "page", "country", "device"],
      rowLimit: options.rowLimit ?? 25000,
      startRow: options.startRow ?? 0,
      dataState: "final",
      type: "web",
    }),
  });

  if (!response.ok) {
    throw new Error(`GSC request failed with HTTP ${response.status}`);
  }

  const body = (await response.json()) as GscApiResponse;
  return normalizeGscRows(body.rows);
}

export interface Ga4PageRow {
  date: string | null;
  landingPage: string | null;
  sessions: number;
  activeUsers: number;
  engagedSessions: number;
  keyEvents: number;
  totalRevenue: number;
}

interface Ga4Value {
  value?: string;
}

interface Ga4ApiRow {
  dimensionValues?: Ga4Value[];
  metricValues?: Ga4Value[];
}

interface Ga4ApiResponse {
  rows?: Ga4ApiRow[];
}

export interface Ga4QueryOptions extends DateRange {
  propertyId: string;
  accessToken: string;
  limit?: number;
  offset?: number;
  fetchImpl?: typeof fetch;
}

function numberValue(value: Ga4Value | undefined): number {
  const parsed = Number(value?.value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeGa4Rows(rows: Ga4ApiRow[] = []): Ga4PageRow[] {
  return rows.map((row) => {
    const dimensions = row.dimensionValues ?? [];
    const metrics = row.metricValues ?? [];
    return {
      date: dimensions[0]?.value ?? null,
      landingPage: dimensions[1]?.value ?? null,
      sessions: numberValue(metrics[0]),
      activeUsers: numberValue(metrics[1]),
      engagedSessions: numberValue(metrics[2]),
      keyEvents: numberValue(metrics[3]),
      totalRevenue: numberValue(metrics[4]),
    };
  });
}

export async function fetchGa4PageAnalytics(options: Ga4QueryOptions): Promise<Ga4PageRow[]> {
  const fetcher = options.fetchImpl ?? fetch;
  const propertyId = options.propertyId.replace(/^properties\//, "");
  if (!/^\d+$/.test(propertyId)) {
    throw new Error("GA4 propertyId must be numeric or formatted as properties/<id>");
  }

  const endpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
  const response = await fetcher(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${options.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: options.startDate, endDate: options.endDate }],
      dimensions: [{ name: "date" }, { name: "landingPagePlusQueryString" }],
      metrics: [
        { name: "sessions" },
        { name: "activeUsers" },
        { name: "engagedSessions" },
        { name: "keyEvents" },
        { name: "totalRevenue" },
      ],
      limit: String(options.limit ?? 100000),
      offset: String(options.offset ?? 0),
    }),
  });

  if (!response.ok) {
    throw new Error(`GA4 request failed with HTTP ${response.status}`);
  }

  const body = (await response.json()) as Ga4ApiResponse;
  return normalizeGa4Rows(body.rows);
}

export interface SearchMetricUpsert {
  query: string;
  pageUrl: string;
  metricDate: string;
  country: string | null;
  device: string | null;
  source: "google_search_console";
  impressions: number;
  clicks: number;
  ctr: number;
  averagePosition: number;
}

export function toSearchMetricUpserts(rows: GscSearchRow[]): SearchMetricUpsert[] {
  return rows.flatMap((row) => {
    if (!row.date || !row.query || !row.page) return [];
    return [{
      query: row.query,
      pageUrl: row.page,
      metricDate: row.date,
      country: row.country,
      device: row.device,
      source: "google_search_console" as const,
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: row.ctr,
      averagePosition: row.averagePosition,
    }];
  });
}

export interface AnalyticsEvidenceRecord {
  pagePath: string;
  metricDate: string;
  source: "google_analytics";
  payload: {
    sessions: number;
    activeUsers: number;
    engagedSessions: number;
    keyEvents: number;
    totalRevenue: number;
  };
}

export function toAnalyticsEvidence(rows: Ga4PageRow[]): AnalyticsEvidenceRecord[] {
  return rows.flatMap((row) => {
    if (!row.date || !row.landingPage) return [];
    return [{
      pagePath: row.landingPage,
      metricDate: row.date,
      source: "google_analytics" as const,
      payload: {
        sessions: row.sessions,
        activeUsers: row.activeUsers,
        engagedSessions: row.engagedSessions,
        keyEvents: row.keyEvents,
        totalRevenue: row.totalRevenue,
      },
    }];
  });
}
