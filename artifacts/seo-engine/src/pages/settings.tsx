import { Badge } from "../components/layout";
import { PageHeader } from "../components/operational-table";

export default function SettingsPage() {
  return (
    <>
      <header className="topbar">
        <div>
          <strong>System Setup</strong>
          <span className="muted"> Settings</span>
        </div>
      </header>

      <div className="content">
        <PageHeader 
          eyebrow="CONFIGURATION"
          title="Engine Settings"
          description="View core system policies and operational constraints."
        />

        <div className="grid grid-cols-1 gap-6 max-w-3xl">
          <section className="card">
            <h2 className="text-lg font-bold text-[#172033] mb-4">Autonomy Policy</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#f8fafc] border border-[#e5e9f0] rounded-lg">
                <div>
                  <p className="font-bold text-[#172033] text-sm">Guarded Autonomy</p>
                  <p className="text-xs text-[#77839a] mt-1">Actions require human approval before deployment.</p>
                </div>
                <Badge tone="verified">ENFORCED</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#f8fafc] border border-[#e5e9f0] rounded-lg">
                <div>
                  <p className="font-bold text-[#172033] text-sm">Read-only Connections</p>
                  <p className="text-xs text-[#77839a] mt-1">System cannot modify data at the source without a deployment.</p>
                </div>
                <Badge tone="verified">ENFORCED</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#f8fafc] border border-[#e5e9f0] rounded-lg">
                <div>
                  <p className="font-bold text-[#172033] text-sm">Automatic Rollbacks</p>
                  <p className="text-xs text-[#77839a] mt-1">Revert deployments if regressions are detected.</p>
                </div>
                <Badge tone="approval">PENDING SETUP</Badge>
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="text-lg font-bold text-[#172033] mb-4">Runtime configuration</h2>
            <p className="text-sm text-[#455168]">
              Secret values and credential-presence details are never exposed to the browser.
              The Connections page reports only sanitized provider readiness and authorization
              status supplied by the API.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
