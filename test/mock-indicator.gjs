#!/usr/bin/env -S gjs -m

// Manual GJS integration fixture for the StatusNotifierItem and DBusMenu UI.

import Gio from "gi://Gio";
import GLib from "gi://GLib";

const scenarios = {
  menu: {
    apps: [["menu", "VPN Menu Stress Test", "Active"]],
    instructions: "Expand the app menu and exercise its nested submenus.",
  },
  passive: {
    apps: [["passive", "Passive Indicator Test", "Passive"]],
    instructions:
      "Toggle General → Hide passive indicators. This app should disappear when enabled and return when disabled.",
  },
  "app-override": {
    apps: [
      ["override-control", "Override Control", "Active"],
      ["override-a", "Override App A", "Active"],
      ["override-b", "Override App B", "Active"],
      ["override-c", "Override App C", "NeedsAttention"],
    ],
    instructions: [
      "In preferences → Apps, click Add override in Labels, Ordering, or Hide, then select a test app. Select it again in the same list to check that the picker closes and focuses the existing override without resetting it. Leave Control without overrides.",
      "Override Control: leave its label empty, priority at 0, and hiding off. It should keep its name and remain visible throughout the checks.",
      "Override App A (active): rename to My custom label and apply; set priority to 0. Hide and unhide it: the custom label should survive. Clear and apply the label to restore Override App A.",
      "Override App B (active): set priority to -10. Leave its label empty and hiding off to verify App A’s changes do not affect it.",
      "Override App C (needs attention): set priority to -20. Among A/B/C, expect C, B, A. Hide and unhide C to verify attention does not bypass hiding and its priority survives.",
      "Back on App B: set priority to -20 too. Among A/B/C, expect B, C, A (registration order breaks the tie). Reset B and C to 0: expect Control, A, B, C. Expand the app menus after reordering to check submenu placement.",
      "Persistence: set A’s custom label, B’s priority, and C’s hiding, then restart this command. Verify all three are retained and Control remains unchanged. Clear labels, reset priorities to 0, and unhide to restore defaults.",
    ].join("\n"),
  },
};
// GLibUnix was split out in newer GLib versions; keep older dev systems working.
let addUnixSignal;
try {
  const { default: GLibUnix } = await import("gi://GLibUnix");
  addUnixSignal = GLibUnix.signal_add;
} catch {
  addUnixSignal = GLib.unix_signal_add;
}

const mode = ARGV[0]?.replace(/^--/, "") ?? "menu";
if (ARGV.length > 1 || !Object.hasOwn(scenarios, mode))
  throw new Error("Usage: mock-indicator.gjs [--passive|--app-override]");
const scenario = scenarios[mode];
const BUS_NAME = `org.example.AppIndicatorMock.${mode.replaceAll("-", "_")}`;
const MENU_PATH = "/Menu";
const WATCHER_NAME = "org.kde.StatusNotifierWatcher";
const WATCHER_PATH = "/StatusNotifierWatcher";

const SNI_XML = `
<node>
  <interface name="org.kde.StatusNotifierItem">
    <property name="Category" type="s" access="read"/>
    <property name="Id" type="s" access="read"/>
    <property name="Title" type="s" access="read"/>
    <property name="Status" type="s" access="read"/>
    <property name="IconName" type="s" access="read"/>
    <property name="Menu" type="o" access="read"/>
    <property name="ItemIsMenu" type="b" access="read"/>
    <method name="Activate"><arg type="i" direction="in"/><arg type="i" direction="in"/></method>
    <method name="SecondaryActivate"><arg type="i" direction="in"/><arg type="i" direction="in"/></method>
    <method name="ContextMenu"><arg type="i" direction="in"/><arg type="i" direction="in"/></method>
    <method name="Scroll"><arg type="i" direction="in"/><arg type="s" direction="in"/></method>
  </interface>
</node>`;

const MENU_XML = `
<node>
  <interface name="com.canonical.dbusmenu">
    <method name="GetLayout">
      <arg type="i" direction="in"/><arg type="i" direction="in"/><arg type="as" direction="in"/>
      <arg type="u" direction="out"/><arg type="(ia{sv}av)" direction="out"/>
    </method>
    <method name="Event">
      <arg type="i" direction="in"/><arg type="s" direction="in"/>
      <arg type="v" direction="in"/><arg type="u" direction="in"/>
    </method>
    <method name="AboutToShow"><arg type="i" direction="in"/><arg type="b" direction="out"/></method>
    <signal name="LayoutUpdated"><arg type="u"/><arg type="i"/></signal>
    <signal name="ItemsPropertiesUpdated"><arg type="a(ia{sv})"/><arg type="a(ias)"/></signal>
  </interface>
</node>`;

let nextId = 1;
const item = (label, children = [], properties = {}) => ({
  id: nextId++,
  properties: { label, enabled: true, visible: true, ...properties },
  children,
});
const separator = () => item("", [], { type: "separator" });

const countries = [
  "Albania",
  "Australia",
  "Canada",
  "France",
  "Germany",
  "Japan",
  "Netherlands",
  "Sweden",
  "United Kingdom",
  "United States",
].map((country) => item(country));

const stressLayout = {
  id: 0,
  properties: {},
  children: [
    item("VPN disconnected", [], { enabled: false }),
    item("Quick Connect"),
    item("Connect to", countries),
    item("Recent connections", [item("France"), item("Germany")]),
    item("Specialty servers", [
      item("P2P", [
        item("Canada"),
        item("France"),
        item("Germany"),
        item("Netherlands"),
        item("Sweden"),
        item("United States"),
      ]),
      item("Double VPN", [
        item("Canada → United States"),
        item("France → United Kingdom"),
        item("Germany → Netherlands"),
        item("Sweden → Netherlands"),
        item("United Kingdom → France"),
      ]),
      item("Onion over VPN", [item("Netherlands"), item("Switzerland"), item("United States")]),
    ]),
    separator(),
    item("Settings", [
      item("Auto-connect", [], { "toggle-type": "checkmark", "toggle-state": 1 }),
      item("Threat Protection", [], { "toggle-type": "checkmark", "toggle-state": 0 }),
      item("Kill Switch", [], { "toggle-type": "checkmark", "toggle-state": 1 }),
      item("Notifications", [], { "toggle-type": "checkmark", "toggle-state": 1 }),
    ]),
    item("Diagnostics", [
      item("Connection details"),
      item("Network interfaces"),
      item("DNS status"),
      item("Routing table"),
      item("Firewall status"),
      item("Collect logs"),
      item("Reset test state"),
    ]),
    separator(),
    item("Open VPN app"),
    item("Log out"),
    item("Quit mock indicator"),
  ],
};

const layout =
  mode === "menu"
    ? stressLayout
    : {
        id: 0,
        properties: {},
        children: [
          item("Test action"),
          item("Test submenu", [item("First action"), item("Second action")]),
        ],
      };

function variantProperties(properties) {
  const result = {};
  for (const [name, value] of Object.entries(properties)) {
    const signature = typeof value === "boolean" ? "b" : typeof value === "number" ? "i" : "s";
    result[name] = new GLib.Variant(signature, value);
  }
  return result;
}

function encodeNode(node) {
  const properties = { ...node.properties };
  if (node.children.length > 0) properties["children-display"] = "submenu";
  const children = node.children.map((child) => new GLib.Variant("(ia{sv}av)", encodeNode(child)));
  return [node.id, variantProperties(properties), children];
}

function createStatusNotifier([id, title, status]) {
  return {
    get Category() {
      return "ApplicationStatus";
    },
    get Id() {
      return `appindicator-${id}-test`;
    },
    get Title() {
      return title;
    },
    get Status() {
      return status;
    },
    get IconName() {
      return "network-vpn-symbolic";
    },
    get Menu() {
      return MENU_PATH;
    },
    get ItemIsMenu() {
      return true;
    },
    Activate() {},
    SecondaryActivate() {},
    ContextMenu() {},
    Scroll() {},
  };
}

const dbusMenu = {
  GetLayoutAsync(_params, invocation) {
    invocation.return_value(new GLib.Variant("(u(ia{sv}av))", [1, encodeNode(layout)]));
  },
  EventAsync(params, invocation) {
    const [id, eventName] = params;
    print(`Menu event: item=${id}, event=${eventName}`);
    invocation.return_value(null);
  },
  AboutToShowAsync(_params, invocation) {
    invocation.return_value(new GLib.Variant("(b)", [false]));
  },
};

const loop = new GLib.MainLoop(null, false);
const exportedObjects = [];

const pending = scenario.apps.map((app, index) => ({ app, path: `/StatusNotifierItem${index}` }));
let registering = false;
let retryId = 0;

function registerWithWatcher() {
  if (registering || !pending.length) return;
  registering = true;
  const { app, path } = pending[0];
  // Register sequentially so conflict tests have a predictable default order.
  Gio.DBus.session.call(
    WATCHER_NAME,
    WATCHER_PATH,
    WATCHER_NAME,
    "RegisterStatusNotifierItem",
    new GLib.Variant("(s)", [path]),
    null,
    Gio.DBusCallFlags.NONE,
    3000,
    null,
    (connection, result) => {
      registering = false;
      try {
        connection.call_finish(result);
        pending.shift();
        print(`Registered appindicator-${app[0]}-test (${app[2]}): ${app[1]}`);
        if (pending.length) registerWithWatcher();
        else
          print(
            `Open Quick Settings → Running Apps.\n${scenario.instructions}\nStop with Ctrl+C. Saved overrides remain available in preferences.`,
          );
      } catch (error) {
        printerr(`Waiting for ${WATCHER_NAME}: ${error.message}`);
      }
    },
  );
}

const ownerId = Gio.bus_own_name(
  Gio.BusType.SESSION,
  BUS_NAME,
  Gio.BusNameOwnerFlags.NONE,
  (connection) => {
    const dbusMenuObject = Gio.DBusExportedObject.wrapJSObject(MENU_XML, dbusMenu);
    dbusMenuObject.export(connection, MENU_PATH);
    exportedObjects.push(dbusMenuObject);
    for (const { app, path } of pending) {
      const object = Gio.DBusExportedObject.wrapJSObject(SNI_XML, createStatusNotifier(app));
      object.export(connection, path);
      exportedObjects.push(object);
    }
  },
  () => {
    registerWithWatcher();
    retryId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
      if (!pending.length) {
        retryId = 0;
        return GLib.SOURCE_REMOVE;
      }
      registerWithWatcher();
      return GLib.SOURCE_CONTINUE;
    });
  },
  () => {
    printerr(`Unable to own ${BUS_NAME}. Is this scenario already running?`);
    loop.quit();
  },
);

const signalIds = [2, 15].map((signal) =>
  addUnixSignal(GLib.PRIORITY_DEFAULT, signal, () => {
    loop.quit();
    return GLib.SOURCE_CONTINUE;
  }),
);
try {
  loop.run();
} finally {
  for (const id of signalIds) GLib.source_remove(id);
  if (retryId) GLib.source_remove(retryId);
  for (const object of exportedObjects) object.unexport();
  Gio.bus_unown_name(ownerId);
}
