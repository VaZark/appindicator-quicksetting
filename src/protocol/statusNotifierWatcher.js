import Gio from "gi://Gio";
import GLib from "gi://GLib";
import * as Signals from "resource:///org/gnome/shell/misc/signals.js";
import { STATUS_NOTIFIER_WATCHER_XML, WATCHER_PATH, DEFAULT_ITEM_PATH } from "./interfaces.js";
import { StatusNotifierItem } from "./statusNotifierItem.js";

const WATCHER_BUS_NAME = "org.kde.StatusNotifierWatcher";

export class StatusNotifierWatcher extends Signals.EventEmitter {
  constructor() {
    super();

    this._destroyed = false;
    this._items = new Map();

    this._dbusImpl = null;
    this._nameId = 0;
    this._idleSourceId = 0;
    this._connection = null;

    /*
     * Do NOT export /StatusNotifierWatcher yet.
     *
     * First request ownership of the well-known name.
     */
    this._nameId = Gio.bus_own_name(
      Gio.BusType.SESSION,
      WATCHER_BUS_NAME,
      Gio.BusNameOwnerFlags.NONE,

      /*
       * bus acquired
       */
      (connection) => {
        this._connection = connection;
      },

      /*
       * name acquired
       */
      (connection) => {
        if (this._destroyed) return;

        try {
          this._exportWatcher(connection);
        } catch (e) {
          logError(e, "Unable to export StatusNotifierWatcher");

          /*
           * Don't leave half-initialized state behind.
           */
          this._unexportWatcher();
          return;
        }

        this._onNameAcquired();

        this._idleSourceId = GLib.idle_add(GLib.PRIORITY_LOW, () => {
          this._idleSourceId = 0;

          if (!this._destroyed) this._discoverExistingItems();

          return GLib.SOURCE_REMOVE;
        });
      },

      /*
       * name lost
       */
      () => {
        if (this._destroyed) return;

        this._onNameLost();
      },
    );
  }

  _exportWatcher(connection) {
    if (this._dbusImpl) return;

    const impl = Gio.DBusExportedObject.wrapJSObject(STATUS_NOTIFIER_WATCHER_XML, this);

    /*
     * export() can throw if another extension inside the same
     * gnome-shell process already exported this exact
     * interface/path.
     *
     * Keep it local until export succeeds so cleanup remains
     * deterministic.
     */
    impl.export(connection, WATCHER_PATH);

    this._dbusImpl = impl;
  }

  _unexportWatcher() {
    if (!this._dbusImpl) return;

    try {
      this._dbusImpl.unexport();
    } catch (e) {
      logError(e, "Unable to unexport StatusNotifierWatcher");
    }

    this._dbusImpl = null;
  }

  _onNameAcquired() {
    console.log("[AppIndicator Quick Settings] " + "StatusNotifierWatcher acquired");

    this._emitSignal("StatusNotifierHostRegistered", null);
  }

  _onNameLost() {
    console.warn(
      "[AppIndicator Quick Settings] " +
        "org.kde.StatusNotifierWatcher is already owned. " +
        "Disable any other AppIndicator/KStatusNotifierItem " +
        "GNOME Shell extension.",
    );
  }

  async RegisterStatusNotifierItemAsync(params, invocation) {
    const [service] = params;

    try {
      let busName;
      let objectPath;

      /*
       * Ayatana/libappindicator frequently registers the object
       * path and expects us to use the method caller as bus name.
       */
      if (service.startsWith("/")) {
        busName = invocation.get_sender();

        objectPath = service;
      } else {
        busName = await this._resolveBusName(service);

        objectPath = DEFAULT_ITEM_PATH;
      }

      if (!busName) {
        throw new Error(`Unable to resolve StatusNotifierItem ${service}`);
      }

      this._register(busName, objectPath, service);

      invocation.return_value(null);
    } catch (e) {
      logError(e);

      invocation.return_dbus_error("org.gnome.gjs.StatusNotifierError", e.message);
    }
  }

  RegisterStatusNotifierHostAsync(_params, invocation) {
    /*
     * We ARE the visualization host, so additional host tracking
     * isn't important to our current implementation.
     */
    invocation.return_value(null);

    this._emitSignal("StatusNotifierHostRegistered", null);
  }

  async _resolveBusName(name) {
    if (name.startsWith(":")) return name;

    try {
      const result = await Gio.DBus.session.call(
        "org.freedesktop.DBus",
        "/org/freedesktop/DBus",
        "org.freedesktop.DBus",
        "GetNameOwner",
        new GLib.Variant("(s)", [name]),
        new GLib.VariantType("(s)"),
        Gio.DBusCallFlags.NONE,
        1000,
        null,
      );

      const [owner] = result.deep_unpack();

      return owner;
    } catch {
      return null;
    }
  }

  _register(busName, objectPath, service = null) {
    const key = `${busName}${objectPath}`;

    if (this._items.has(key)) return this._items.get(key);

    let item;

    try {
      item = new StatusNotifierItem(busName, objectPath, service);
    } catch (e) {
      logError(e, `Could not create StatusNotifierItem ${key}`);

      return null;
    }

    this._items.set(key, item);

    item.connect("destroy", () => {
      this._remove(item);
    });

    this._announceItemChange("added", "Registered", item);

    return item;
  }

  _remove(item) {
    if (!this._items.has(item.uniqueId)) return;

    this._items.delete(item.uniqueId);

    this._announceItemChange("removed", "Unregistered", item);
  }

  _announceItemChange(event, dbusEvent, item) {
    this.emit(`item-${event}`, item);
    this._emitSignal(`StatusNotifierItem${dbusEvent}`, new GLib.Variant("(s)", [item.uniqueId]));
    this._emitItemsChanged();
  }

  _emitSignal(name, value) {
    if (this._destroyed) return;

    try {
      this._dbusImpl.emit_signal(name, value);
    } catch (e) {
      logError(e);
    }
  }

  _emitItemsChanged() {
    if (this._destroyed) return;

    try {
      this._dbusImpl.emit_property_changed(
        "RegisteredStatusNotifierItems",
        new GLib.Variant("as", this.RegisteredStatusNotifierItems),
      );
    } catch (e) {
      logError(e);
    }
  }

  async _discoverExistingItems() {
    if (this._destroyed) return;

    let result;

    try {
      result = await Gio.DBus.session.call(
        "org.freedesktop.DBus",
        "/org/freedesktop/DBus",
        "org.freedesktop.DBus",
        "ListNames",
        null,
        new GLib.VariantType("(as)"),
        Gio.DBusCallFlags.NONE,
        2000,
        null,
      );
    } catch (e) {
      logError(e, "Unable to enumerate session bus");

      return;
    }

    const [names] = result.deep_unpack();

    /*
     * Standard SNI applications expose a well-known service
     * following this convention.
     *
     * Badly behaved applications that expose only arbitrary unique
     * bus names require introspection scanning; we'll add that
     * separately rather than polluting the watcher.
     */
    for (const name of names) {
      if (
        !name.startsWith("org.kde.StatusNotifierItem-") &&
        !name.startsWith("org.freedesktop.StatusNotifierItem-")
      ) {
        continue;
      }

      const owner = await this._resolveBusName(name);

      if (!owner) continue;

      this._register(owner, DEFAULT_ITEM_PATH, name);
    }
  }

  get RegisteredStatusNotifierItems() {
    return Array.from(this._items.values(), (item) => item.uniqueId);
  }

  get IsStatusNotifierHostRegistered() {
    return true;
  }

  get ProtocolVersion() {
    return 0;
  }

  destroy() {
    if (this._destroyed) return;

    this._destroyed = true;

    if (this._idleSourceId) {
      GLib.Source.remove(this._idleSourceId);
      this._idleSourceId = 0;
    }

    /*
     * Destroy items before removing the watcher.
     */
    for (const item of [...this._items.values()]) {
      item.destroy();
    }

    this._items.clear();

    /*
     * Remove exported DBus object first.
     */
    this._unexportWatcher();

    /*
     * Then relinquish the well-known name.
     */
    if (this._nameId) {
      Gio.bus_unown_name(this._nameId);

      this._nameId = 0;
    }

    this._connection = null;
  }
}
