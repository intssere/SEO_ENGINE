import assert from "node:assert/strict"; import test from "node:test"; import { readFile } from "node:fs/promises";
test("UGP-4.1 implementation remains pure and transport-free",async()=>{const s=await readFile(new URL("./controlled-mcp-connector.ts",import.meta.url),"utf8");
 for(const token of ["fetch(","axios","@modelcontextprotocol","child_process","node:net","node:http","node:https","drizzle","postgres","process.env"]) assert.equal(s.includes(token),false,"forbidden boundary: "+token);
 assert.equal(s.includes("liveTransportEnabled:false"),true); assert.equal(s.includes("arbitraryToolExecution:false"),true);
});
