# Project continuity and release discipline

- GitHub `main` is canonical; Replit is a runtime/deployment target, not a second source of truth.
- Never move from PR implementation directly to production. Require PR CI for the exact head, exact-head merge, post-merge `main` push CI, exact Replit sync, Replit validation, publish, runtime certification, then Git reconciliation.
- Replit may create metadata-only publish commits or incidental `.replit` environment-module changes. Inspect changed files and tree identity before deciding whether to preserve them. Git cleanup does not require republishing.
- Development and production database schemas must match before a Replit publish. Publishing with development behind production previously removed production-only Task #55 auth objects.
- Authentication, provider connection, execution authorization, global write gates, and exact per-action confirmation are separate trust boundaries. Do not collapse them.
- A generic `continue` instruction advances the current safe workflow but never substitutes for explicit provider/public-site mutation authorization.
- Handoffs must record exact branch, head SHA, PR, CI run/result, canonical main SHA/tree, deployment state, DB schema state, and the next independently verifiable action. Do not hand off secrets or identity values.
- When semantics appear inconsistent, first determine whether fields belong to different domains before rewriting data. The Task #56 evaluator-risk vs plan-control-risk diagnosis is the canonical example.