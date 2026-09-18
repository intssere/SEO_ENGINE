import { useGetPerformance, GetPerformanceDays, GetPerformanceDevice } from "@workspace/api-client-react";
import { Loader2, AlertCircle } from "lucide-react";
import { useSearch, useLocation } from "wouter";
import { OperationalTable, PageHeader } from "../components/operational-table";

export default function PerformancePage() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(searchString);

  const daysParam = Number(searchParams.get("days"));
  const days = Object.values(GetPerformanceDays).includes(daysParam as any) 
    ? (daysParam as GetPerformanceDays) 
    : GetPerformanceDays.NUMBER_28;

  const deviceParam = searchParams.get("device");
  const device = Object.values(GetPerformanceDevice).includes(deviceParam as any)
    ? (deviceParam as GetPerformanceDevice)
    : GetPerformanceDevice.all;

  const country = searchParams.get("country") || "";

  const { data, isLoading, isError } = useGetPerformance({
    days,
    device,
    ...(country ? { country } : {})
  });

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchString);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setLocation("?" + params.toString(), { replace: true });
  };

  return (
    <>
      <header className="topbar">
        <div>
          <strong>Organic Outcomes</strong>
          <span className="muted"> Performance</span>
        </div>
        <div className="filters">
          <label className="sr-only" htmlFor="performance-days">Reporting window</label>
          <select
            id="performance-days"
            aria-label="Reporting window"
            className="border border-[#dce2eb] rounded-md px-2 py-1 text-sm bg-white text-[#536078]"
            value={days}
            onChange={(e) => updateParam("days", e.target.value)}
          >
            <option value={7}>Last 7 days</option>
            <option value={28}>Last 28 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <label className="sr-only" htmlFor="performance-country">Country</label>
          <select
            id="performance-country"
            aria-label="Country"
            className="border border-[#dce2eb] rounded-md px-2 py-1 text-sm bg-white text-[#536078]"
            value={country}
            onChange={(e) => updateParam("country", e.target.value)}
          >
            <option value="">All</option>
            <option value="US">US</option>
            <option value="GB">GB</option>
            <option value="CA">Canada</option>
          </select>
          <label className="sr-only" htmlFor="performance-device">Device</label>
          <select
            id="performance-device"
            aria-label="Device"
            className="border border-[#dce2eb] rounded-md px-2 py-1 text-sm bg-white text-[#536078]"
            value={device}
            onChange={(e) => updateParam("device", e.target.value)}
          >
            <option value="all">All devices</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
            <option value="tablet">Tablet</option>
          </select>
        </div>
      </header>

      <div className="content">
        <PageHeader 
          eyebrow="METRICS" 
          title="Search Performance" 
          description="Real persisted search performance metrics filtering applied against live backend."
          readiness={data?.readiness}
        />

        <section className="card">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-[#647087]" role="status" aria-live="polite">
              <Loader2 className="w-8 h-8 animate-spin text-[#3c82f6] mb-4" aria-hidden="true" />
              <p className="font-medium text-sm">Loading performance data...</p>
            </div>
          ) : isError || !data ? (
            <div className="flex flex-col items-center justify-center p-12 text-destructive" role="alert">
              <AlertCircle className="w-10 h-10 mb-4" aria-hidden="true" />
              <p className="font-medium">Failed to load performance data.</p>
            </div>
          ) : (
            <OperationalTable 
              data={data.rows} 
              emptyMessage="No performance data available for this criteria." 
            />
          )}
        </section>
      </div>
    </>
  );
}
