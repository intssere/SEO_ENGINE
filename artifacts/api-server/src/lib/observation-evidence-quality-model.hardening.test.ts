// Canonical P3.5 hardening-test entrypoint.
// The comprehensive hardening suite scans the canonical production source and
// remains in the legacy compatibility-named module for this milestone branch.
// Importing it here makes the canonical milestone triple explicit to the
// workspace test runner without changing runtime behavior or authorization.
import "./observation-evidence-quality-conflict-model.hardening.test.js";
