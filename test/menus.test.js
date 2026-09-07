import assert from "node:assert/strict";
import test from "node:test";
import {
  previewHeight,
  previewStyle,
  revealAdjustment,
} from "../src/ui/indicator/submenuLayout.js";
import { setOpenedSubMenu } from "../src/ui/indicator/submenuState.js";

function createMenu(parent = null) {
  return {
    _parent: parent,
    closeCalls: [],
    isOpen: true,
    close(params) {
      this.closeCalls.push(params);
      this.isOpen = false;
    },
  };
}

test("opening a nested submenu keeps the app item menu expanded", () => {
  const appItemMenu = createMenu();
  const nestedMenu = createMenu(appItemMenu);
  const rootMenu = { _openedSubMenu: appItemMenu };

  setOpenedSubMenu(rootMenu, nestedMenu);

  assert.equal(rootMenu._openedSubMenu, appItemMenu);
  assert.deepEqual(appItemMenu.closeCalls, []);
});

test("opening sibling nested submenus preserves the outer app branch", () => {
  // Mirrors the sibling nested-menu structure in Ubuntu's indicator test tool.
  const appItemMenu = createMenu();
  const firstNestedMenu = createMenu(appItemMenu);
  const secondNestedMenu = createMenu(appItemMenu);
  const rootMenu = { _openedSubMenu: appItemMenu };

  setOpenedSubMenu(rootMenu, firstNestedMenu);
  setOpenedSubMenu(rootMenu, secondNestedMenu);

  assert.equal(rootMenu._openedSubMenu, appItemMenu);
  assert.deepEqual(appItemMenu.closeCalls, []);
});

test("opening a separate app menu collapses the previous app menu", () => {
  const firstAppMenu = createMenu();
  const secondAppMenu = createMenu();
  const rootMenu = { _openedSubMenu: firstAppMenu };

  setOpenedSubMenu(rootMenu, secondAppMenu);

  assert.deepEqual(firstAppMenu.closeCalls, [{ animate: true }]);
  assert.equal(rootMenu._openedSubMenu, secondAppMenu);
});

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
