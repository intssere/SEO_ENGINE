"use client";

import { usePathname } from "next/navigation";
import { dashboardNav } from "../../lib/navigation";

export function DashboardShell({ children, approvalsPending = 0, dataState = "unknown" }: { children: React.ReactNode; approvalsPending?: number; dataState?: "live" | "setup_required" | "unavailable" | "unknown" }) {
  const pathname = usePathname();
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brandMark">S</span><div><strong>SEO ENGINE</strong><small>AI SEO Command Center</small></div></div>
        <nav>{dashboardNav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const suffix = item.label === "Approvals" && approvalsPending > 0 ? ` · ${approvalsPending}` : "";
          return <a className={active ? "active" : ""} href={item.href} key={item.href}>{item.label}{suffix}</a>;
        })}</nav>
        <div className="sidebarFoot"><span className={`statusDot ${dataState === "live" ? "" : "offline"}`} /> {dataState === "live" ? "Engine online" : dataState === "setup_required" ? "Setup required" : "Data unavailable"}<br/><small>Guarded autonomy</small></div>
      </aside>
      <section className="workspace">{children}</section>
    </main>
  );
}
