// Node's fetch implementation accepts these request input forms even when the DOM RequestInfo alias is not included by this artifact's TypeScript libs.
type RequestInfo = string | URL | Request;
