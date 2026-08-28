import assert from "node:assert/strict";
import test from "node:test";
import { collectChangedPropertyNames, ICON_PROPERTIES } from "../src/propertyChanges.js";

test("collectChangedPropertyNames includes changed and invalidated properties", () => {
  const names = collectChangedPropertyNames({ Status: "Active" }, ["Menu", "IconName"]);

  assert.deepEqual([...names], ["Status", "Menu", "IconName"]);
});

test("the icon property group covers regular and attention icons", () => {
  assert.deepEqual(ICON_PROPERTIES, [
    "IconName",
    "IconPixmap",
    "AttentionIconName",
    "AttentionIconPixmap",
    "IconThemePath",
  ]);
});
