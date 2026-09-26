# UGP-2.2 — Progressive Disclosure UX

Status: implementation candidate on `initiative-universal-growth-platform`

## Goal

SEO ENGINE should present the minimum useful information first while keeping evidence and technical state available in the same workflow.

The standard presentation model is:

1. **Customer view** — concise state, problem, priority, risk and next action.
2. **Evidence view** — rationale, confidence, coverage and traceable supporting evidence.
3. **Advanced view** — provenance, quality checks, exact identifiers, authorization state and unavailable technical dimensions.

Progressive disclosure changes presentation only. It does not change evidence, policy, authorization, provider capability or execution authority.

## Standard interaction

The reusable `ProgressiveDisclosure` component uses native HTML `details` / `summary` semantics.

Default state:

- customer view visible;
- evidence collapsed;
- advanced details nested inside evidence and therefore hidden.

Opening evidence does not automatically expose the advanced layer. The user must explicitly open technical details.

No global expert-mode switch is required to reach evidence.

## Opportunities

The Opportunities workspace is the first certified application.

### Customer view

Visible by default:

- opportunity;
- priority;
- confidence summary;
- risk;
- recommendation;
- whether the recommendation has been applied.

The default table no longer exposes execution authorization as an operational field.

### Evidence view

On request:

- why the opportunity qualifies;
- supporting rationale;
- declared evidence count;
- confidence;
- evidence sufficiency when available;
- coverage scope;
- traceable evidence IDs when the current API exposes them.

### Advanced view

On a second request:

- execution-authorization state when exposed;
- proposal-quality score and approval eligibility;
- quality checks;
- blockers and warnings;
- semantic provenance;
- exact unavailable evidence dimensions.

Unavailable data remains unavailable. The UI does not infer missing IDs, provenance, freshness, conflict, retention or corroboration state.

## Detailed-route framing

Customer-friendly nested routes identify their level in the page shell.

Examples:

- `/content/research` → **Evidence view**
- `/site-audit/technical` → **Advanced view**
- `/automation/safety` → **Advanced view**
- `/settings/connections` → **Advanced view**

The banner always links back to the parent customer domain.

Legacy engineering URLs remain mounted for compatibility and certification.

## Accessibility

- native `summary` controls remain keyboard operable;
- disclosure targets retain minimum interactive target sizing;
- nested views are not focus traps;
- friendly detailed routes remain axe-scanned;
- mobile layouts retain a direct back path to the parent workspace.

## Performance

UGP-2.2 does not raise P11.1 budgets.

The implementation deliberately:

- avoids a new disclosure library;
- uses native browser disclosure behavior;
- shortens redundant customer copy;
- retains the existing hard JavaScript and CSS ceilings.

## Out of scope

UGP-2.2 does not define the final opportunity/action card grammar. That remains UGP-2.3.

It also does not change backend APIs, database schema, provider access, mutation authorization, deployment or publication.
