import assert from "node:assert/strict";
import test from "node:test";
import { createSignalManager, resetDisposable } from "../src/utils/lifecycle.js";

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
