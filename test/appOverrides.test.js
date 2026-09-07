import assert from "node:assert/strict";
import test from "node:test";
import {
  readAppOverrides,
  addAppOverride,
  updateAppOverride,
  getAppOverride,
  orderAppItems,
} from "../src/utils/appOverrides.js";

function settings(initial = "{}") {
  let value = initial;
  return {
    get_string: () => value,
    set_string: (_key, next) => {
      value = next;
    },
  };
}

test("per-app changes preserve other overrides and applications", () => {
  const store = settings();
  updateAppOverride(store, "chat", { name: "Chat", label: "Work", order: -2, hidden: true });
  updateAppOverride(store, "music", { label: "Music" });
  updateAppOverride(store, "chat", { name: "Chat App", label: "" });
  assert.deepEqual(readAppOverrides(store), {
    chat: { name: "Chat App", label: "", order: -2, hidden: true },
    music: { label: "Music" },
  });
});

test("malformed storage and invalid records use defaults", () => {
  for (const value of ["null", "[]", "false", "bad JSON"])
    assert.deepEqual(readAppOverrides(settings(value)), {});
  assert.deepEqual(readAppOverrides(settings('{"a":null,"b":[],"c":{"label":"C"}}')), {
    c: { label: "C" },
  });
  assert.deepEqual(getAppOverride({}, "constructor"), {});
  const store = settings();
  updateAppOverride(store, "__proto__", { label: "App" });
  assert.equal(getAppOverride(readAppOverrides(store), "__proto__").label, "App");
});

test("priorities fall back to original registration order on conflict", () => {
  const apps = ["a", "b", "c", "d", "e"];
  const records = { a: { order: 3 }, b: { order: -1 }, c: { order: -1 }, e: { order: "invalid" } };
  assert.deepEqual(
    orderAppItems(apps, records, (id) => id),
    ["b", "c", "d", "e", "a"],
  );
  assert.deepEqual(apps, ["a", "b", "c", "d", "e"]);
  assert.deepEqual(
    orderAppItems(apps, {}, (id) => id),
    apps,
  );
  assert.deepEqual(
    orderAppItems(apps, { a: { order: -2 } }, (id) => id),
    apps,
  );
});

test("multiple instances of the same app share priority and retain registration order", () => {
  const apps = [{ id: "a", instance: 1 }, { id: "b" }, { id: "a", instance: 2 }];
  assert.deepEqual(
    orderAppItems(apps, { a: { order: -1 } }, (item) => item.id),
    [apps[0], apps[2], apps[1]],
  );
});

test("removing or switching an override restores defaults without losing other settings", () => {
  const store = settings();
  updateAppOverride(store, "chat", { name: "Chat", label: "Work", order: -2, hidden: true });
  updateAppOverride(store, "chat", { order: undefined });
  assert.deepEqual(getAppOverride(readAppOverrides(store), "chat"), {
    name: "Chat",
    label: "Work",
    hidden: true,
  });
  updateAppOverride(store, "chat", { label: undefined, order: 0 });
  assert.deepEqual(getAppOverride(readAppOverrides(store), "chat"), {
    name: "Chat",
    order: 0,
    hidden: true,
  });
  updateAppOverride(store, "chat", { order: undefined, hidden: undefined });
  assert.deepEqual(getAppOverride(readAppOverrides(store), "chat"), { name: "Chat" });
});

test("adding an override creates only the selected type and never resets an existing value", () => {
  const store = settings();
  updateAppOverride(store, "chat", { name: "Chat" });
  assert.equal(addAppOverride(store, "chat", "label"), true);
  assert.deepEqual(readAppOverrides(store), { chat: { name: "Chat", label: "" } });
  updateAppOverride(store, "chat", { label: "Work" });
  assert.equal(addAppOverride(store, "chat", "label"), false);
  assert.equal(getAppOverride(readAppOverrides(store), "chat").label, "Work");
  assert.equal(addAppOverride(store, "chat", "order"), true);
  assert.equal(addAppOverride(store, "chat", "hidden"), true);
  assert.equal(addAppOverride(store, "chat", "hidden"), false);
  assert.equal(addAppOverride(store, "chat", "unknown"), false);
  assert.deepEqual(readAppOverrides(store), {
    chat: { name: "Chat", label: "Work", order: 0, hidden: false },
  });
});
