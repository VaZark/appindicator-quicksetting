import assert from "node:assert/strict";
import test from "node:test";
import { IndicatorItems } from "../src/ui/indicatorItems.js";

function createHarness() {
  const menuItems = [];
  const destroyedIds = [];
  const items = new IndicatorItems(
    (indicator) => ({ indicator, destroy: () => destroyedIds.push(indicator.uniqueId) }),
    (item) => menuItems.push(item),
  );

  return { destroyedIds, items, menuItems };
}

test("adds an app item to the menu once", () => {
  const { items, menuItems } = createHarness();
  const indicator = { uniqueId: "org.example.App/item" };

  const item = items.add(indicator);
  const duplicate = items.add(indicator);

  assert.equal(menuItems.length, 1);
  assert.equal(menuItems[0], item);
  assert.equal(item.indicator, indicator);
  assert.equal(duplicate, null);
  assert.equal(items.size, 1);
});

test("removes and destroys an app item", () => {
  const { destroyedIds, items } = createHarness();
  const indicator = { uniqueId: "org.example.App/item" };

  items.add(indicator);

  assert.equal(items.remove(indicator), true);
  assert.equal(items.size, 0);
  assert.deepEqual(destroyedIds, [indicator.uniqueId]);
  assert.equal(items.remove(indicator), false);
  assert.deepEqual(destroyedIds, [indicator.uniqueId]);
});

test("visibility follows rendered items rather than registered indicators", () => {
  const { items } = createHarness();
  assert.equal(items.hasVisibleItems, false);

  const passive = items.add({ uniqueId: "passive" });
  passive.visible = false;
  assert.equal(items.size, 1);
  assert.equal(items.hasVisibleItems, false);

  passive.visible = true;
  assert.equal(items.hasVisibleItems, true);
  passive.visible = false;
  assert.equal(items.hasVisibleItems, false);

  const active = items.add({ uniqueId: "active" });
  active.visible = true;
  assert.equal(items.hasVisibleItems, true);
  items.remove({ uniqueId: "active" });
  assert.equal(items.hasVisibleItems, false);
});

test("active app IDs include hidden apps and survive removal of another instance", () => {
  const items = new IndicatorItems(
    (indicator) => ({ appId: indicator.id, visible: false, destroy() {} }),
    () => {},
  );
  items.add({ uniqueId: "first", id: "chat" });
  items.add({ uniqueId: "second", id: "chat" });
  items.add({ uniqueId: "third", id: "music" });
  assert.deepEqual(items.appIds, ["chat", "music"]);
  items.remove({ uniqueId: "first" });
  assert.deepEqual(items.appIds, ["chat", "music"]);
  items.remove({ uniqueId: "second" });
  assert.deepEqual(items.appIds, ["music"]);
  items.destroyAll();
  assert.deepEqual(items.appIds, []);
});
