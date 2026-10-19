import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseRefs } from "./refs.js";

describe("parseRefs", () => {
  test("extracts unique refs from a snapshot", () => {
    const snapshot = `
- link "Home" [ref=e1]
- button "Go" [ref=e2]
- link "Home" [ref=e1]
- textbox "Note" [ref=f12]
`;
    assert.deepEqual(parseRefs(snapshot).sort(), ["e1", "e2", "f12"]);
  });

  test("returns empty when no refs", () => {
    assert.deepEqual(parseRefs("- heading \"Title\""), []);
  });
});
