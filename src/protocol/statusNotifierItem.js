import Gio from "gi://Gio";
import GLib from "gi://GLib";
import Shell from "gi://Shell";
import * as Signals from "resource:///org/gnome/shell/misc/signals.js";
import { lookupFlatpakAppInfo } from "../utils/appNames.js";
import { createSignalManager } from "../utils/lifecycle.js";
import { STATUS_NOTIFIER_ITEM_IFACE } from "./interfaces.js";
import { collectChangedPropertyNames, ICON_PROPERTIES } from "./propertyChanges.js";

export const SNIStatus = Object.freeze({
  PASSIVE: "Passive",
  ACTIVE: "Active",
  NEEDS_ATTENTION: "NeedsAttention",
});

export class StatusNotifierItem extends Signals.EventEmitter {
  constructor(busName, objectPath, service = null) {
    super();

    this.busName = busName;
    this.objectPath = objectPath;
    this.service = service ?? busName;

    this._destroyed = false;
    this._properties = new Map();
    this._appName = null;
    this._cancellable = new Gio.Cancellable();
    this._signals = createSignalManager();

    this._proxy = this._createProxy(busName, objectPath);
    this._connectProxySignals();
    this._loadCachedProperties();
    this._connectAppSystemSignals();
    this._updateAppName();
  }

  _createProxy(busName, objectPath) {
    return Gio.DBusProxy.new_for_bus_sync(
      Gio.BusType.SESSION,
      Gio.DBusProxyFlags.NONE,
      null,
      busName,
      objectPath,
      STATUS_NOTIFIER_ITEM_IFACE,
      null,
    );
  }

  _connectProxySignals() {
    this._signals.connect(this._proxy, "g-properties-changed", (_proxy, changed, invalidated) => {
      this._onPropertiesChanged(changed, invalidated);
    });

    this._signals.connect(this._proxy, "g-signal", (_proxy, sender, signal, params) => {
      this._onSignal(sender, signal, params);
    });

    this._signals.connect(this._proxy, "notify::g-name-owner", () => {
      if (!this._proxy?.g_name_owner) this.destroy();
    });
  }

  _connectAppSystemSignals() {
    this._appSystem = Shell.AppSystem.get_default();
    this._signals.connect(this._appSystem, "installed-changed", () => this._updateAppName());
    this._signals.connect(this._appSystem, "app-state-changed", () => this._updateAppName());
  }

  async _updateAppName() {
    if (this._destroyed || this._appName || this._appNameLookupPending) return;

    this._appNameLookupPending = true;

    try {
      const result = await dbusCall(
        Gio.DBus.session,
        "org.freedesktop.DBus",
        "/",
        "org.freedesktop.DBus",
        "GetConnectionUnixProcessID",
        new GLib.Variant("(s)", [this.busName]),
        new GLib.VariantType("(u)"),
        this._cancellable,
      );
      const [pid] = result.deepUnpack();
      const appInfo =
        Shell.WindowTracker.get_default().get_app_from_pid(pid)?.appInfo ??
        this._getFlatpakAppInfo(pid);
      const appName = appInfo?.get_display_name();

      if (!this._destroyed && appName && appName !== this._appName) {
        this._appName = appName;
        this.emit("changed");
      }
    } catch (e) {
      if (!e.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED)) {
        console.debug(`Unable to resolve the application name for ${this.busName}: ${e.message}`);
      }
    } finally {
      this._appNameLookupPending = false;
    }
  }

  _getFlatpakAppInfo(pid) {
    try {
      const metadata = new GLib.KeyFile();
      metadata.load_from_file(`/proc/${pid}/root/.flatpak-info`, GLib.KeyFileFlags.NONE);

      const appId = metadata.get_string("Application", "name");
      return lookupFlatpakAppInfo(appId, (desktopId) => this._appSystem.lookup_app(desktopId));
    } catch {
      return null;
    }
  }

  _loadCachedProperties() {
    const names = this._proxy.get_cached_property_names() ?? [];

    for (const name of names) {
      const value = this._proxy.get_cached_property(name);

      if (value) this._properties.set(name, value);
    }
  }

  _onPropertiesChanged(changed, invalidated) {
    const values = changed.unpack();

    for (const [name, value] of Object.entries(values)) this._properties.set(name, value);

    for (const name of invalidated) this._properties.delete(name);

    const changedNames = collectChangedPropertyNames(values, invalidated);

    this._emitPropertyChanges(changedNames);
  }

  _emitPropertyChanges(changedNames) {
    this.emit("changed");

    if (changedNames.has("Status")) this.emit("status-changed");

    if (ICON_PROPERTIES.some((name) => changedNames.has(name))) {
      this.emit("icon-changed");
    }

    if (changedNames.has("Menu")) this.emit("menu-changed");
  }

  _onSignal(_sender, signal, _params) {
    /*
     * SNI implementations frequently emit NewFoo instead of
     * org.freedesktop.DBus.Properties.PropertiesChanged.
     */
    switch (signal) {
      case "NewIcon":
        this._refreshAndEmit(["IconName", "IconPixmap", "IconThemePath"], "icon-changed");
        break;

      case "NewAttentionIcon":
        this._refreshAndEmit(
          ["AttentionIconName", "AttentionIconPixmap", "IconThemePath"],
          "icon-changed",
        );
        break;

      case "NewIconThemePath":
        this._refreshAndEmit(["IconThemePath"], "icon-changed");
        break;

      case "NewStatus":
        this._refreshAndEmit(["Status"], "status-changed");
        break;

      case "NewTitle":
        this._refreshAndEmit(["Title"], "changed");
        break;

      case "NewToolTip":
        this._refreshAndEmit(["ToolTip"], "changed");
        break;

      case "NewMenu":
        this._refreshAndEmit(["Menu"], "menu-changed");
        break;

      case "XAyatanaNewLabel":
        this._refreshAndEmit(["XAyatanaLabel"], "changed");
        break;
    }
  }

  _refreshAndEmit(propertyNames, signal) {
    this._refreshMany(propertyNames);
    this.emit(signal);
  }

  _refreshMany(names) {
    for (const name of names) this._refreshProperty(name);
  }

  _refreshProperty(name) {
    if (this._destroyed) return;

    try {
      const result = Gio.DBus.session.call_sync(
        this.busName,
        this.objectPath,
        "org.freedesktop.DBus.Properties",
        "Get",
        new GLib.Variant("(ss)", [STATUS_NOTIFIER_ITEM_IFACE, name]),
        new GLib.VariantType("(v)"),
        Gio.DBusCallFlags.NONE,
        1000,
        null,
      );

      const [value] = result.deep_unpack();
      this._properties.set(name, value);
    } catch {
      /* Optional property not provided by this implementation. */
    }
  }

  _get(name, fallback = null) {
    const value = this._properties.get(name);
    if (!value) return fallback;

    try {
      return value.deep_unpack();
    } catch {
      return fallback;
    }
  }

  _getVariant(name) {
    return this._properties.get(name) ?? null;
  }

  get uniqueId() {
    return `${this.busName}${this.objectPath}`;
  }

  get id() {
    return this._get("Id", this.service);
  }

  get title() {
    return this._get("Title", this.id);
  }

  get appName() {
    return this._appName;
  }

  get label() {
    return this._get("XAyatanaLabel", null);
  }

  get status() {
    return this._get("Status", SNIStatus.ACTIVE);
  }

  get category() {
    return this._get("Category", "ApplicationStatus");
  }

  get iconName() {
    return this._get("IconName", null);
  }

  get attentionIconName() {
    return this._get("AttentionIconName", null);
  }

  get iconThemePath() {
    return this._get("IconThemePath", null);
  }

  get iconPixmap() {
    return this._getVariant("IconPixmap");
  }

  get attentionIconPixmap() {
    return this._getVariant("AttentionIconPixmap");
  }

  get menuPath() {
    const path = this._get("Menu", null);
    return path === "/NO_DBUSMENU" ? null : path;
  }

  get itemIsMenu() {
    return this._get("ItemIsMenu", false);
  }

  activate(x = 0, y = 0) {
    return this._call("Activate", new GLib.Variant("(ii)", [x, y]));
  }

  secondaryActivate(x = 0, y = 0) {
    return this._call("SecondaryActivate", new GLib.Variant("(ii)", [x, y]));
  }

  contextMenu(x = 0, y = 0) {
    return this._call("ContextMenu", new GLib.Variant("(ii)", [x, y]));
  }

  scroll(delta, orientation) {
    return this._call("Scroll", new GLib.Variant("(is)", [delta, orientation]));
  }

  _call(method, params) {
    if (this._destroyed) return;

    Gio.DBus.session.call(
      this.busName,
      this.objectPath,
      STATUS_NOTIFIER_ITEM_IFACE,
      method,
      params,
      null,
      Gio.DBusCallFlags.NONE,
      -1,
      null,
      (_connection, result) => {
        try {
          Gio.DBus.session.call_finish(result);
        } catch (e) {
          logError(e, `StatusNotifierItem.${method}`);
        }
      },
    );
  }

  destroy() {
    if (this._destroyed) return;

    this._destroyed = true;
    this._cancellable.cancel();
    this.emit("destroy");

    this._signals.reset();
    this._appSystem = null;
    this._cancellable = null;
    this._proxy = null;
    this._properties.clear();
  }
}

function dbusCall(
  connection,
  busName,
  objectPath,
  interfaceName,
  method,
  params,
  replyType,
  cancellable,
) {
  return new Promise((resolve, reject) => {
    connection.call(
      busName,
      objectPath,
      interfaceName,
      method,
      params,
      replyType,
      Gio.DBusCallFlags.NONE,
      -1,
      cancellable,
      (source, result) => {
        try {
          resolve(source.call_finish(result));
        } catch (e) {
          reject(e);
        }
      },
    );
  });
}
