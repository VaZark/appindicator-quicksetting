import assert from "node:assert/strict";
import test from "node:test";
import { previewHeight, previewStyle, revealAdjustment } from "../src/ui/submenuLayout.js";

test("submenu preview height includes the first five items", () => {
  assert.equal(previewHeight([36, 40, 38, 50, 42, 60]), 206);
});

test("submenu preview height supports short submenus", () => {
  assert.equal(previewHeight([36, 40]), 76);
});

test("short submenus receive their preview height", () => {
  assert.equal(
    previewStyle("padding: 4px; min-height: 200px;", [36, 40]),
    "padding: 4px; min-height: 76px;",
  );
});

test("scrolls down just enough to reveal the preview", () => {
  assert.equal(revealAdjustment(100, 200, 600, 250, 370), 170);
});

test("keeps an already visible preview in place", () => {
  assert.equal(revealAdjustment(100, 200, 600, 120, 280), 100);
});

test("clamps the reveal to the scrollable range", () => {
  assert.equal(revealAdjustment(300, 200, 420, 390, 500), 220);
});
