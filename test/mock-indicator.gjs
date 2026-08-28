#!/usr/bin/env -S gjs -m

// Manual GJS integration fixture for the StatusNotifierItem and DBusMenu UI.

import Gio from "gi://Gio";
import GLib from "gi://GLib";

const BUS_NAME = "org.example.AppIndicatorMenuTest";
const ITEM_PATH = "/StatusNotifierItem";
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

const layout = {
  id: 0,
  properties: {},
  children: [
    item("VPN disconnected", [], { enabled: false }),
    item("Quick Connect"),
    item("Connect to", countries),
    item("Recent connections", [
      item("France"),
      item("Germany"),
      item("United Kingdom"),
      item("United States"),
    ]),
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

const statusNotifier = {
  get Category() {
    return "ApplicationStatus";
  },
  get Id() {
    return "appindicator-menu-test";
  },
  get Title() {
    return "VPN Menu Stress Test";
  },
  get Status() {
    return "Active";
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

function registerWithWatcher() {
  try {
    Gio.DBus.session.call_sync(
      WATCHER_NAME,
      WATCHER_PATH,
      WATCHER_NAME,
      "RegisterStatusNotifierItem",
      new GLib.Variant("(s)", [BUS_NAME]),
      null,
      Gio.DBusCallFlags.NONE,
      1000,
      null,
    );
    print("Mock indicator registered. Open Quick Settings → Running Apps.");
    return GLib.SOURCE_REMOVE;
  } catch (error) {
    printerr(`Waiting for ${WATCHER_NAME}: ${error.message}`);
    return GLib.SOURCE_CONTINUE;
  }
}

Gio.bus_own_name(
  Gio.BusType.SESSION,
  BUS_NAME,
  Gio.BusNameOwnerFlags.NONE,
  (connection) => {
    const statusNotifierObject = Gio.DBusExportedObject.wrapJSObject(SNI_XML, statusNotifier);
    const dbusMenuObject = Gio.DBusExportedObject.wrapJSObject(MENU_XML, dbusMenu);

    statusNotifierObject.export(connection, ITEM_PATH);
    dbusMenuObject.export(connection, MENU_PATH);
    exportedObjects.push(statusNotifierObject, dbusMenuObject);

    registerWithWatcher();
    GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, registerWithWatcher);
  },
  null,
  () => {
    printerr(`Unable to own ${BUS_NAME}`);
    loop.quit();
  },
);

loop.run();
