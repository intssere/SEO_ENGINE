# Task #19 — AI SEO Command Center v1

## Purpose
Turn the SEO ENGINE web shell into an operational command center. The overview is decision-first rather than a generic reporting dashboard: performance provides context, while opportunities, approvals, engine activity, verification, experiments, learning, AI visibility, and verified impact drive the workflow.

## UX hierarchy
The overview answers five questions in order:
1. How are we doing?
2. What changed?
3. What should we do next?
4. What needs human attention?
5. Is the engine producing verified value?

## Information architecture
Primary navigation includes Overview, Opportunities, Actions, Approvals, Performance, Rankings, Technical SEO, Internal Links, AI Visibility, Experiments, Search Intelligence, Learning, Deployments, Impact, Connections, and Settings.

The overview exposes:
- six executive health metrics
- global site/date/country/device context
- engine/autonomy state
- 24-hour AI engine activity
- prioritized opportunity queue
- traceable AI activity feed
- deployment verification health
- AI/GEO visibility summary
- learning signal summary
- 90-day verified impact
- command entry point for Ask SEO ENGINE

## Interaction contract
Every future recommendation detail should expose the chain:
`why -> evidence -> expected impact -> risk -> action -> result`.

The Overview intentionally uses drill-down affordances instead of placing every diagnostic on one screen. Task #19 v1 establishes the production information architecture and responsive UI shell; subsequent API wiring can replace fixture values without redesigning the hierarchy.

## State language
- green: verified, safe, positive
- amber: approval, uncertainty, pending human decision
- red: regression, blocked, failure
- purple: controlled experiment/learning context

## Safety
The dashboard does not bypass Task #14 safety classification or Task #15 execution gates. UI labels never imply that an action was executed merely because it is AUTO-eligible. Public-site writes remain controlled by the global kill switch and connector authorization.

## Data integrity
Fixture values in v1 are presentation fixtures, not production measurements. They must be replaced by persisted/aggregated site data during live pilot wiring. The UI must not present fixture values as actual Diamond Shelf results in production.

## Responsive behavior
Desktop uses persistent navigation and dense decision tables. Tablet collapses layout columns. Mobile removes the persistent sidebar, stacks cards, preserves engine status and command access, and keeps decision data horizontally scrollable when necessary.
