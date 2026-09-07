import assert from "node:assert/strict";
import test from "node:test";
import { ExtensionController } from "../src/controllers/extensionController.js";
import { createSignalManager, resetDisposable } from "../src/utils/lifecycle.js";

function createHarness() {
  const calls = [];
  let protocolMessages;

  const widget = {
    addIndicator: (item) => calls.push(["add-indicator", item]),
    removeIndicator: (item) => calls.push(["remove-indicator", item]),
    destroy: () => calls.push(["destroy-widget"]),
  };
  const protocol = {
    start(messages) {
      protocolMessages = messages;
      calls.push(["start-protocol"]);
    },
    stop: () => calls.push(["stop-protocol"]),
  };
  const controller = new ExtensionController({
    createWidget: () => widget,
    createProtocol: () => protocol,
    addWidget: (toggle) => calls.push(["add-toggle", toggle]),
  });

  return { calls, controller, getProtocolMessages: () => protocolMessages, protocol, widget };
}

test("extension enable creates and adds the Quick Settings toggle", () => {
  const { calls, controller, widget } = createHarness();

  controller.enable();

  assert.deepEqual(calls, [["add-toggle", widget], ["start-protocol"]]);
  assert.equal(controller.widget, widget);
});

test("protocol messages add and remove app items", () => {
  const { calls, controller, getProtocolMessages } = createHarness();
  const item = { uniqueId: "example" };

  controller.enable();
  getProtocolMessages().indicatorAdded(item);
  getProtocolMessages().indicatorRemoved(item);

  assert.deepEqual(calls.slice(2), [
    ["add-indicator", item],
    ["remove-indicator", item],
  ]);
});

test("extension disable stops the protocol backend and removes the toggle", () => {
  const { calls, controller } = createHarness();

  controller.enable();
  controller.disable();

  assert.deepEqual(calls.slice(2), [["stop-protocol"], ["destroy-widget"]]);
  assert.equal(controller.widget, null);
  assert.equal(controller.protocol, null);
});

test("signal manager disconnects tracked signals once", () => {
  const disconnected = [];
  const source = { connect: (_signal, _handler) => 42, disconnect: (id) => disconnected.push(id) };
  const signals = createSignalManager();

  signals.connect(source, "changed", () => {});
  signals.reset();
  signals.reset();

  assert.deepEqual(disconnected, [42]);
  assert.equal(signals.size, 0);
  assert.equal(signals.isEmpty, true);
});

test("signal manager exposes snapshots and resets one signal group", () => {
  const disconnected = [];
  let nextId = 1;
  const source = { connect: () => nextId++, disconnect: (id) => disconnected.push(id) };
  const otherSource = { connect: () => nextId++, disconnect: (id) => disconnected.push(id) };
  const signals = createSignalManager();

  signals.connect(source, "changed", () => {});
  signals.connect(source, "changed", () => {});
  signals.connect(source, "destroy", () => {});
  signals.connect(otherSource, "changed", () => {});

  assert.equal(signals.size, 4);
  assert.equal(signals.isEmpty, false);
  assert.deepEqual(signals.getSignalIds(source, "changed"), [1, 2]);
  assert.deepEqual(
    signals.connections.map(({ signal, id }) => ({ signal, id })),
    [
      { signal: "changed", id: 1 },
      { signal: "changed", id: 2 },
      { signal: "destroy", id: 3 },
      { signal: "changed", id: 4 },
    ],
  );

  assert.equal(signals.resetSignal(source, "changed"), 2);
  assert.equal(signals.resetSignal(source, "changed"), 0);
  assert.deepEqual(disconnected, [2, 1]);
  assert.equal(signals.size, 2);

  signals.reset();
  assert.deepEqual(disconnected, [2, 1, 4, 3]);
});

test("resetDisposable destroys and clears an owned object", () => {
  let destroyed = false;
  const value = resetDisposable({ destroy: () => (destroyed = true) });

  assert.equal(destroyed, true);
  assert.equal(value, null);
  assert.equal(resetDisposable(null), null);
});
