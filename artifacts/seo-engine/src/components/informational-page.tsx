import { Badge } from "../components/layout";

interface InformationalPageProps {
  category: string;
  title: string;
  description: string;
  status: "coming_soon" | "read_only" | "unavailable";
}

export function InformationalPage({ category, title, description, status }: InformationalPageProps) {
  return (
    <>
      <header className="topbar">
        <div>
          <strong>Informational</strong>
          <span className="muted"> {title}</span>
        </div>
      </header>

      <div className="content">
        <div className="titleRow">
          <div>
            <p className="eyebrow">{category}</p>
            <h1>{title}</h1>
            <p className="muted">{description}</p>
          </div>
          <div>
            <Badge tone={status === "read_only" ? "verified" : "approval"}>
              {status === "read_only" ? "READ-ONLY" : status === "coming_soon" ? "COMING SOON" : "UNAVAILABLE"}
            </Badge>
          </div>
        </div>

        <section className="card flex flex-col items-center justify-center p-16 text-center bg-[#fbfbfc]">
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-bold text-[#172033] mb-2">No synthetic data</h3>
            <p className="text-[#455168] text-sm leading-relaxed mb-6">
              This module operates in strict guarded-autonomy mode. Because the required 
              dependencies or permissions are not yet configured on this environment, 
              we do not display placeholder or generated metrics.
            </p>
            <p className="text-[#77839a] text-xs font-semibold tracking-wide">
              EVIDENCE-FIRST POLICY ENFORCED
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
