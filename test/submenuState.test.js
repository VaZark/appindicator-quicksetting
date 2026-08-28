import assert from "node:assert/strict";
import test from "node:test";
import { setOpenedSubMenu } from "../src/ui/submenuState.js";

function createMenu(parent = null) {
  return {
    _parent: parent,
    closeCalls: [],
    isOpen: true,
    close(animate) {
      this.closeCalls.push(animate);
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

  assert.deepEqual(firstAppMenu.closeCalls, [true]);
  assert.equal(rootMenu._openedSubMenu, secondAppMenu);
});
