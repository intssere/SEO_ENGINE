import { OperationalListPage } from "../components/operational-list-page";
export const dynamic = "force-dynamic";
export default function Page() { return <OperationalListPage kind="approvals" eyebrow="HUMAN CONTROL" title="Approvals" description="Approval-required plans are visible here. This v1 view is read-only and does not bypass the production authorization gate." />; }
