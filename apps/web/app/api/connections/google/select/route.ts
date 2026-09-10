import { NextResponse } from "next/server";
import postgres from "postgres";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) return NextResponse.redirect(new URL("/connections?error=Database%20is%20not%20configured", request.url));
  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  try {
    const form = await request.formData();
    const gscSiteUrl = String(form.get("gscSiteUrl") ?? "").trim();
    const ga4PropertyId = String(form.get("ga4PropertyId") ?? "").trim();
    if (!/^https:\/\/diamondshelf\.us\/?$/i.test(gscSiteUrl)) throw new Error("Select the Diamond Shelf Search Console property.");
    if (!/^\d+$/.test(ga4PropertyId)) throw new Error("Select a valid GA4 property.");

    const rows = await sql<{ id: string; metadata: Record<string, unknown> }[]>`
      SELECT c.id, c.metadata
      FROM connections c
      JOIN sites s ON s.id = c.site_id
      WHERE lower(s.domain) = 'diamondshelf.us' AND c.provider = 'google' AND c.external_account_id = 'google'
      ORDER BY c.updated_at DESC LIMIT 1
    `;
    const connection = rows[0];
    if (!connection) throw new Error("Google connection is not available.");

    const gsc = Array.isArray(connection.metadata.discoveredSearchConsoleProperties) ? connection.metadata.discoveredSearchConsoleProperties as Array<{ siteUrl?: string }> : [];
    const ga4 = Array.isArray(connection.metadata.discoveredGa4Properties) ? connection.metadata.discoveredGa4Properties as Array<{ propertyId?: string }> : [];
    const gscAllowed = gsc.some((entry) => entry.siteUrl?.replace(/\/$/, "").toLowerCase() === gscSiteUrl.replace(/\/$/, "").toLowerCase());
    const ga4Allowed = ga4.some((entry) => entry.propertyId === ga4PropertyId);
    if (!gscAllowed || !ga4Allowed) throw new Error("Selected Google properties were not discovered during OAuth connection.");

    const metadata = { ...connection.metadata, gscSiteUrl, ga4PropertyId, needsConfirmation: false };
    await sql`UPDATE connections SET status = 'connected', metadata = ${sql.json(metadata)}, updated_at = now() WHERE id = ${connection.id}::uuid`;
    return NextResponse.redirect(new URL("/connections?connected=google", request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save Google property selection.";
    return NextResponse.redirect(new URL(`/connections?error=${encodeURIComponent(message)}`, request.url));
  } finally {
    await sql.end({ timeout: 2 });
  }
}
