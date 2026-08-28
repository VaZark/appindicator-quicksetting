import * as Main from "resource:///org/gnome/shell/ui/main.js";

import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

import { StatusNotifierWatcher } from "./src/statusNotifierWatcher.js";
import { destroyUpstream, initializeUpstream } from "./src/interfaces.js";

import { RunningAppsWidget } from "./src/runningAppsWidget.js";

export default class AppIndicatorQuickSettingsExtension extends Extension {
  enable() {
    const upstreamPath = this.dir.get_child("vendor").get_child("gnome-shell-extension-appindicator");
    initializeUpstream({ dir: upstreamPath, path: upstreamPath.get_path() });

    this._widget = new RunningAppsWidget();

    // This is a full-width Quick Settings widget, like Background Apps, rather
    // than a system toggle. Adding it to the menu directly also avoids
    // registering a (hidden) panel indicator solely to host the widget.
    Main.panel.statusArea.quickSettings.menu.addItem(this._widget, 2);

    this._watcher = new StatusNotifierWatcher(this);

    this._addedId = this._watcher.connect("item-added", (_watcher, item) => {
      this._widget.addIndicator(item);
    });

    this._removedId = this._watcher.connect("item-removed", (_watcher, item) => {
      this._widget.removeIndicator(item);
    });
  }

  disable() {
    if (this._watcher) {
      if (this._addedId) this._watcher.disconnect(this._addedId);

      if (this._removedId) this._watcher.disconnect(this._removedId);

      this._watcher.destroy();

      this._watcher = null;
    }

    destroyUpstream();

    this._addedId = 0;

    this._removedId = 0;

    if (this._widget) {
      this._widget.destroy();
      this._widget = null;
    }
  }
}
