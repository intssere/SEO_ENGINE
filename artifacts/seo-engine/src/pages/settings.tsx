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
          description="Manage website connections, automation safeguards, and the configuration that controls how SEO Engine works with your site."
        />

        <div className="grid grid-cols-1 gap-6 max-w-4xl">
          <section className="card">
            <div className="settingsSectionHead">
              <div>
                <h2 className="text-lg font-bold text-[#172033]">
                  Website connections
                </h2>
                <p className="text-sm text-[#647087] mt-1">
                  Connect the website and search-data sources SEO Engine can read.
                  Connection status is shown without exposing secret values.
                </p>
              </div>
              <StatusBadge tone="info">MANAGE HERE</StatusBadge>
            </div>
            <Link href="/settings/connections" className="customerHubAction settingsPrimaryAction">
              Manage connections
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </section>

          <section className="card">
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
                    Changes that require human approval stay blocked until the
                    applicable review workflow is satisfied.
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
                    A connected source does not automatically grant permission to
                    change the live website.
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
                    Automated rollback remains unavailable until the required
                    production workflow is explicitly configured and certified.
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
              Secret values and credential-presence details are never exposed to
              the browser. Customer-facing connection screens receive only the
              sanitized provider readiness and authorization state supplied by
              the API.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
