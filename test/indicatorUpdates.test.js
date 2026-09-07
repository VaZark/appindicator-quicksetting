import assert from "node:assert/strict";
import test from "node:test";
import { collectChangedPropertyNames, ICON_PROPERTIES } from "../src/protocol/propertyChanges.js";
import * as propertyChanges from "../src/protocol/propertyChanges.js";
import { createSignalManager } from "../src/utils/lifecycle.js";
import { loadGiModule } from "./helpers/giModule.js";

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

class Emitter {
  handlers = new Map();
  connect(signal, handler) {
    const id = Symbol();
    this.handlers.set(id, { signal, handler });
    return id;
  }
  disconnect(id) {
    this.handlers.delete(id);
  }
  emit(signal, ...args) {
    for (const entry of [...this.handlers.values()])
      if (entry.signal === signal) entry.handler(this, ...args);
  }
}
class Variant {
  constructor(_type, value) {
    this.value = value;
  }
  deep_unpack() {
    return this.value;
  }
  deepUnpack() {
    return this.value;
  }
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

function harness(t) {
  let resolveProxy;
  const requests = [];
  const errors = [];
  const proxy = new Emitter();
  proxy.get_cached_property_names = () => ["IconName", "Menu"];
  proxy.get_cached_property = (name) => new Variant("v", name === "Menu" ? "/MenuBar" : "original");
  const cancellation = {
    cancelled: false,
    cancel() {
      this.cancelled = true;
    },
  };
  const Gio = {
    DBusProxyFlags: { NONE: 0 },
    DBusCallFlags: { NONE: 0 },
    Cancellable: class {
      constructor() {
        return cancellation;
      }
    },
    DBusProxy: {
      new: () =>
        new Promise((resolve) => {
          resolveProxy = resolve;
        }),
    },
    DBus: {
      session: {
        call(_bus, _path, _iface, method, params) {
          if (method === "GetConnectionUnixProcessID")
            return Promise.resolve(new Variant("(u)", [42]));
          return new Promise((resolve, reject) =>
            requests.push({
              name: params.value[1],
              reject,
              reply: (value) => resolve(new Variant("(v)", [new Variant("v", value)])),
            }),
          );
        },
      },
    },
  };
  const { StatusNotifierItem } = loadGiModule(
    new URL("../src/protocol/statusNotifierItem.js", import.meta.url),
    {
      Gio,
      GLib: { Variant, VariantType: class {} },
      Signals: { EventEmitter: Emitter },
      Shell: {
        AppSystem: { get_default: () => new Emitter() },
        WindowTracker: {
          get_default: () => ({
            get_app_from_pid: () => ({
              appInfo: { get_display_name: () => "Telegram", get_icon: () => null },
            }),
          }),
        },
      },
      createSignalManager,
      ...propertyChanges,
      STATUS_NOTIFIER_ITEM_IFACE: "org.kde.StatusNotifierItem",
      logError: (error) => errors.push(error),
    },
    "StatusNotifierItem",
  );
  const item = new StatusNotifierItem(":1.42", "/StatusNotifierItem");
  t.after(() => {
    item.destroy();
    assert.deepEqual(errors, []);
  });
  return {
    item,
    requests,
    cancellation,
    ready: () => resolveProxy(proxy),
    signal: (name) => proxy.emit("g-signal", null, name, null),
  };
}

test("delayed initialization publishes the app's menu and icon when ready", async (t) => {
  const h = harness(t);
  const menus = [];
  h.item.connect("menu-changed", () => menus.push(h.item.menuPath));
  await flush(); // The event loop remains available while the app has not replied.
  assert.equal(h.item.menuPath, null);
  h.ready();
  await flush();
  assert.equal(h.item.iconName, "original");
  assert.deepEqual(menus, ["/MenuBar"]);
});

test("an icon update is announced only after the new icon data arrives", async (t) => {
  const h = harness(t);
  h.ready();
  await flush();
  const icons = [];
  h.item.connect("icon-changed", () => icons.push(h.item.iconName));
  h.signal("NewIcon");
  await flush();
  assert.equal(h.item.iconName, "original");
  assert.deepEqual(icons, []);
  for (const request of h.requests) request.reply(request.name === "IconName" ? "unread" : null);
  await flush();
  assert.deepEqual(icons, ["unread"]);
});

test("an unsupported optional icon property does not prevent the icon update", async (t) => {
  const h = harness(t);
  h.ready();
  await flush();
  const icons = [];
  h.item.connect("icon-changed", () => icons.push(h.item.iconName));
  h.signal("NewIcon");
  for (const request of h.requests) {
    if (request.name === "IconName") request.reply("unread");
    else request.reject(new Error("Unknown property"));
  }
  await flush();
  assert.deepEqual(icons, ["unread"]);
});

test("removing an app cancels pending updates and ignores late replies", async (t) => {
  const h = harness(t);
  h.ready();
  await flush();
  const icons = [];
  h.item.connect("icon-changed", () => icons.push(h.item.iconName));
  h.signal("NewIcon");
  h.item.destroy();
  assert.equal(h.cancellation.cancelled, true);
  for (const request of h.requests) request.reply("late");
  await flush();
  assert.deepEqual(icons, []);
  assert.equal(h.item.iconName, null);
});

test("removing an app before initialization finishes cannot publish its menu", async (t) => {
  const h = harness(t);
  const menus = [];
  h.item.connect("menu-changed", () => menus.push(h.item.menuPath));
  h.item.destroy();
  h.ready();
  await flush();
  assert.deepEqual(menus, []);
  assert.equal(h.item.menuPath, null);
});
