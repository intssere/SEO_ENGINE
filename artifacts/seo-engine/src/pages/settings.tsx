import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { StatusBadge } from "../components/status-badge";
import { PageHeader } from "../components/operational-table";

export default function SettingsPage() {
  return (
    <>
      <header className="topbar">
        <div>
          <strong>Settings</strong>
          <span className="muted"> Workspace</span>
        </div>
      </header>

      <div className="content">
        <PageHeader
          eyebrow="WORKSPACE"
          title="Settings"
          description="Manage connections and automation safeguards."
        />

        <div className="grid grid-cols-1 gap-6 max-w-4xl">
          <section className="card" data-onboarding-target="settings-websites">
            <div className="settingsSectionHead">
              <div>
                <h2 className="text-lg font-bold text-[#172033]">
                  Website connections
                </h2>
                <p className="text-sm text-[#647087] mt-1">
                  Connect websites and search-data sources without exposing secrets.
                </p>
              </div>
              <StatusBadge tone="info">MANAGE HERE</StatusBadge>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/settings/add-website" className="customerHubAction settingsPrimaryAction">
                Add website
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link href="/settings/connections" className="customerHubAction settingsPrimaryAction">
                Manage connections
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </section>

          <section className="card" data-onboarding-target="settings-safety">
            <h2 className="text-lg font-bold text-[#172033] mb-4">
              Automation safeguards
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 p-4 bg-[#f8fafc] border border-[#e5e9f0] rounded-lg">
                <div>
                  <p className="font-bold text-[#172033] text-sm">
                    Review before applying changes
                  </p>
                  <p className="text-xs text-[#647087] mt-1">
                    Review-required changes stay blocked until approved.
                  </p>
                </div>
                <StatusBadge tone="success">PROTECTED</StatusBadge>
              </div>

              <div className="flex items-center justify-between gap-4 p-4 bg-[#f8fafc] border border-[#e5e9f0] rounded-lg">
                <div>
                  <p className="font-bold text-[#172033] text-sm">
                    Source access starts read-only
                  </p>
                  <p className="text-xs text-[#647087] mt-1">
                    Connecting a source does not grant live-site write access.
                  </p>
                </div>
                <StatusBadge tone="success">PROTECTED</StatusBadge>
              </div>

              <div className="flex items-center justify-between gap-4 p-4 bg-[#f8fafc] border border-[#e5e9f0] rounded-lg">
                <div>
                  <p className="font-bold text-[#172033] text-sm">
                    Automatic recovery
                  </p>
                  <p className="text-xs text-[#647087] mt-1">
                    Automated rollback remains unavailable until certified.
                  </p>
                </div>
                <StatusBadge tone="warning">NOT ACTIVE</StatusBadge>
              </div>
            </div>

            <Link href="/automation" className="customerHubAction settingsSecondaryAction">
              Review automation controls
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </section>

          <section className="card">
            <h2 className="text-lg font-bold text-[#172033] mb-2">
              Security & privacy
            </h2>
            <p className="text-sm text-[#455168]">
              Secrets stay server-side; the browser receives sanitized readiness and authorization state.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
