import assert from "node:assert/strict";
import test from "node:test";
import { ExtensionController } from "../src/controllers/extensionController.js";

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

  return {
    calls,
    controller,
    getProtocolMessages: () => protocolMessages,
    protocol,
    widget,
  };
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
