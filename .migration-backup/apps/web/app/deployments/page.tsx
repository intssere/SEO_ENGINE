import { OperationalListPage } from "../components/operational-list-page";
export const dynamic = "force-dynamic";
export default function Page() { return <OperationalListPage kind="deployments" eyebrow="CHANGE CONTROL" title="Deployments & verification" description="Trace deployed changes to verification state, risk and rationale. No deployment is triggered from this page." />; }
