import assert from "node:assert/strict";
import test from "node:test";
import { ExtensionController } from "../src/extensionController.js";

function createHarness() {
  const calls = [];
  const handlers = new Map();
  let nextSignalId = 1;

  const widget = {
    addIndicator: (item) => calls.push(["add-indicator", item]),
    removeIndicator: (item) => calls.push(["remove-indicator", item]),
    destroy: () => calls.push(["destroy-widget"]),
  };
  const watcher = {
    connect(signal, handler) {
      const id = nextSignalId++;
      handlers.set(signal, { handler, id });
      return id;
    },
    disconnect: (id) => calls.push(["disconnect", id]),
    destroy: () => calls.push(["destroy-watcher"]),
  };
  const controller = new ExtensionController({
    createWidget: () => widget,
    createWatcher: () => watcher,
    addWidget: (toggle) => calls.push(["add-toggle", toggle]),
  });

  return { calls, controller, handlers, watcher, widget };
}

test("extension enable creates and adds the Quick Settings toggle", () => {
  const { calls, controller, widget } = createHarness();

  controller.enable();

  assert.deepEqual(calls, [["add-toggle", widget]]);
  assert.equal(controller.widget, widget);
});

test("watcher events add and remove app items", () => {
  const { calls, controller, handlers, watcher } = createHarness();
  const item = { uniqueId: "example" };

  controller.enable();
  handlers.get("item-added").handler(watcher, item);
  handlers.get("item-removed").handler(watcher, item);

  assert.deepEqual(calls.slice(1), [
    ["add-indicator", item],
    ["remove-indicator", item],
  ]);
});

test("extension disable disconnects the watcher and removes the toggle", () => {
  const { calls, controller } = createHarness();

  controller.enable();
  controller.disable();

  assert.deepEqual(calls.slice(1), [
    ["disconnect", 1],
    ["disconnect", 2],
    ["destroy-watcher"],
    ["destroy-widget"],
  ]);
  assert.equal(controller.widget, null);
  assert.equal(controller.watcher, null);
});
