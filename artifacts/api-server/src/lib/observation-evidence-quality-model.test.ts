// Canonical P3.5 behavior-test entrypoint.
// The comprehensive behavior suite remains in the legacy compatibility-named
// module while P3.5 preserves that import surface. Importing it here ensures
// the canonical milestone triple is exercised by the workspace test runner.
import "./observation-evidence-quality-conflict-model.test.js";
