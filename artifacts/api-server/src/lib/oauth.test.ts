import assert from "node:assert/strict";
import test from "node:test";
import { isGoogleSelectionDiscovered } from "./oauth.js";

const metadata = {
  discoveredSearchConsoleProperties: [
    { siteUrl: "sc-domain:diamondshelf.us", permissionLevel: "siteOwner" },
  ],
  discoveredGa4Properties: [
    { propertyId: "123456", displayName: "Diamond Shelf" },
  ],
};

test("Google property confirmation accepts the exact discovered resources", () => {
  assert.equal(isGoogleSelectionDiscovered(metadata, "sc-domain:diamondshelf.us", "123456"), true);
});

test("Google property confirmation normalizes only the trailing slash for discovered site URLs", () => {
  assert.equal(isGoogleSelectionDiscovered(metadata, "sc-domain:diamondshelf.us/", "123456"), true);
});

test("Google property confirmation rejects resources that were not discovered", () => {
  assert.equal(isGoogleSelectionDiscovered(metadata, "https://other.example", "123456"), false);
  assert.equal(isGoogleSelectionDiscovered(metadata, "sc-domain:diamondshelf.us", "999999"), false);
});