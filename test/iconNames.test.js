import assert from "node:assert/strict";
import test from "node:test";
import { normalizeIconName } from "../src/utils/iconNames.js";

test("normalizeIconName removes supported file extensions", () => {
  assert.equal(normalizeIconName("example.svg"), "example");
  assert.equal(normalizeIconName("example.PNG"), "example");
  assert.equal(normalizeIconName("example.SvG"), "example");
  assert.equal(normalizeIconName("example.status.svg"), "example.status");
});

test("normalizeIconName preserves paths and ordinary icon names", () => {
  assert.equal(normalizeIconName("/opt/example/icon.svg"), "/opt/example/icon.svg");
  assert.equal(normalizeIconName("example-symbolic"), "example-symbolic");
  assert.equal(normalizeIconName("example.jpeg"), "example.jpeg");
  assert.equal(normalizeIconName(""), null);
  assert.equal(normalizeIconName(null), null);
});
