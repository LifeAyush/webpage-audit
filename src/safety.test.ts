import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { assertAllowedHost, isBlockedButtonName, isSensitiveFieldBlob } from "./safety.js";

describe("isBlockedButtonName", () => {
  test("blocks payment and account names", () => {
    assert.equal(isBlockedButtonName("Pay"), true);
    assert.equal(isBlockedButtonName("Sign in"), true);
    assert.equal(isBlockedButtonName("Create account"), true);
    assert.equal(isBlockedButtonName("Place order now"), true);
  });

  test("allows ordinary actions", () => {
    assert.equal(isBlockedButtonName("Details"), false);
    assert.equal(isBlockedButtonName("Learn more"), false);
    assert.equal(isBlockedButtonName(""), false);
  });
});

describe("isSensitiveFieldBlob", () => {
  test("detects password and payment metadata", () => {
    assert.equal(isSensitiveFieldBlob("password current-password", "password"), true);
    assert.equal(isSensitiveFieldBlob("text cc-number card", "text"), true);
    assert.equal(isSensitiveFieldBlob("text note", "text"), false);
  });
});

describe("assertAllowedHost", () => {
  afterEach(() => {
    delete process.env.ALLOWED_HOSTS;
  });

  test("allows any host when unset", () => {
    delete process.env.ALLOWED_HOSTS;
    assert.doesNotThrow(() => assertAllowedHost("https://example.com/"));
  });

  test("rejects hosts outside the allowlist", () => {
    process.env.ALLOWED_HOSTS = "example.com";
    assert.throws(() => assertAllowedHost("https://other.test/"), /ALLOWED_HOSTS/);
    assert.doesNotThrow(() => assertAllowedHost("https://example.com/path"));
  });
});
