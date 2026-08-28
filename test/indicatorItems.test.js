import assert from "node:assert/strict";
import test from "node:test";
import { IndicatorItems } from "../src/indicatorItems.js";

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
