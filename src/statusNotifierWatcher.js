import * as Main from "resource:///org/gnome/shell/ui/main.js";

import * as UpstreamWatcher from "../vendor/gnome-shell-extension-appindicator/statusNotifierWatcher.js";
import * as UpstreamUtil from "../vendor/gnome-shell-extension-appindicator/util.js";

import { StatusNotifierItem } from "./statusNotifierItem.js";

export const WATCHER_BUS_NAME = UpstreamWatcher.WATCHER_BUS_NAME;

export class StatusNotifierWatcher {
  constructor(extension) {
    this._items = new Map();
    this._destroyed = false;
    this._watchDog = { nameAcquired: false, nameOnBus: true };

    const owner = this;
    this._upstream = new (class extends UpstreamWatcher.StatusNotifierWatcher {
      async _registerItem(service, busName, objectPath) {
        await super._registerItem(service, busName, objectPath);

        const indicator = this._items.get(UpstreamUtil.indicatorId(service, busName, objectPath));

        if (!indicator) return;

        const item = new StatusNotifierItem(indicator);
        owner._items.set(item.uniqueId, item);
        item.connect("destroy", () => owner._remove(item));
        owner.emit("item-added", item);

        const panelIcon = Main.panel.statusArea[`appindicator-${item.uniqueId}`];
        panelIcon?.destroy();
      }
    })(extension, this._watchDog);
  }

  connect(signal, callback) {
    if (!this._signals) this._signals = new Map();
    const id = Symbol(signal);
    this._signals.set(id, { signal, callback });
    return id;
  }

  disconnect(id) {
    this._signals?.delete(id);
  }

  emit(signal, ...args) {
    for (const { signal: name, callback } of this._signals?.values() ?? []) {
      if (name === signal) callback(this, ...args);
    }
  }

  _remove(item) {
    if (!this._items.delete(item.uniqueId)) return;
    this.emit("item-removed", item);
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    for (const item of this._items.values()) item.destroy();
    this._items.clear();
    this._upstream.destroy();
    this._signals?.clear();
  }
}
