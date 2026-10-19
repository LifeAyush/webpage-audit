import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { assertHttpUrl } from "./tools.js";

describe("assertHttpUrl", () => {
  test("accepts http and https", () => {
    assert.equal(assertHttpUrl("https://example.com/a"), "https://example.com/a");
    assert.equal(assertHttpUrl("http://127.0.0.1:9/"), "http://127.0.0.1:9/");
  });

  test("rejects file and credentials", () => {
    assert.throws(() => assertHttpUrl("file:///etc/passwd"), /Only http and https/);
    assert.throws(() => assertHttpUrl("https://user:pass@example.com/"), /credentials/);
    assert.throws(() => assertHttpUrl("not a url"), /Invalid URL/);
  });
});
