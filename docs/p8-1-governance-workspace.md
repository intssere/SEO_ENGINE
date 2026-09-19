# P8.1 — Unified Opportunity → Proposal → Approval Governance Workspace v1

P8.1 adds a deterministic, read-only frontend governance workspace at `/governance`.

It reconciles only existing GET data from `/api/opportunities`, `/api/actions`, and `/api/approvals`. No backend route or OpenAPI change is introduced.

## Reconciliation

IDs must be unique within each source. Proposal/approval rows must reference an existing opportunity. The same proposal ID in Actions and Approvals must agree on exact control-lineage and projected display fields; conflict fails closed rather than selecting a hidden source winner.

Each unique proposal produces one governance row. Opportunities without proposals remain visible as opportunity-only `not_ready` rows. Canonical ordering is serialization only, not recommendation, review priority, or execution order.

## Descriptive review states

The page displays `not_ready`, `pending`, `approved`, `rejected`, and `revision_requested` as descriptive projections only. Approved does not authorize execution.

## Control separation

The workspace exposes no proposal edit, approve/reject action, authorization creation/renewal, execution, rollback, verification action, or persistence mutation. `execution_authorized` and `public_site_writes` are displayed only as persisted source fields.

## UX and safety

Execute navigation places Governance before Actions and Approvals. The page carries READ-ONLY GOVERNANCE / NO APPROVAL GRANT / NO EXECUTION labels, summary cards, a searchable/sortable DataGrid, and links to dedicated source views.

P8.1 adds no provider/site request, database mutation, approval grant, execution, rollback, scheduler/worker behavior, deployment, or publication.
