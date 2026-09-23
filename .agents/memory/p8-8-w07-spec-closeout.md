# P8.8 W07 specification closeout

W07 policy-aware single-action apply specification/review is certified complete.

- Issue #461 / PR #462.
- Exact certified spec head: `50ecafcb53a1bbf50ca1714e917616dd58c9c7da`.
- PR-head CI #939 / run `35894054466`: success.
- Merge/canonical main: `15846991123b6664c37176b844550d4b0095b39a`.
- Canonical tree: `94f2ccfa5b265e2ee0a8f470546428c1d6d7b9e1`.
- Post-merge CI #945 / run `35895949868`: success.
- Replit main exact-synced, ahead/behind `0/0`, clean.

Frozen W07 design:
- dedicated policy provenance;
- two-phase durable dispatch fence `reserved_prewrite -> dispatch_started`;
- W04 remains claimed until terminal closure;
- release only on exact no-dispatch proof;
- consume only after a spent forward attempt reaches safe terminal closure;
- manual intervention on uncertainty;
- exact W02 after bytes for forward mutation and exact before bytes for rollback;
- never reuse Task #53 normalization;
- at most one forward mutation and one rollback mutation;
- exact provider state plus independent provider/storefront verification;
- no automatic write retries;
- future migration 0007 limited to policy dispatch state/events;
- future policy execution gate default-off; W10 owns live activation.

Next explicit boundary: W07-E1–E5 implementation. Generic continuation is not implementation authorization.

Still blocked: Production migrations 0005/0006/0007, Production DDL/DML/control/reservation/claim/dispatch changes, live provider reads/writes, rollback writes, Task #51/#53/#54 execution, scheduler/worker/policy activation, credential/scope/config changes, deployment/publication, W08–W10.
