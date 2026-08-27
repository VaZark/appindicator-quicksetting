import * as Main from "resource:///org/gnome/shell/ui/main.js";

import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

import { StatusNotifierWatcher } from "./src/statusNotifierWatcher.js";

import { RunningAppsIndicator } from "./src/runningAppsIndicator.js";

export default class AppIndicatorQuickSettingsExtension extends Extension {
  enable() {
    this._indicator = new RunningAppsIndicator();

    Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);

    this._watcher = new StatusNotifierWatcher();

    this._addedId = this._watcher.connect("item-added", (_watcher, item) => {
      this._indicator.addIndicator(item);
    });

    this._removedId = this._watcher.connect("item-removed", (_watcher, item) => {
      this._indicator.removeIndicator(item);
    });
  }

  disable() {
    if (this._watcher) {
      if (this._addedId) this._watcher.disconnect(this._addedId);

      if (this._removedId) this._watcher.disconnect(this._removedId);

      this._watcher.destroy();

      this._watcher = null;
    }

    this._addedId = 0;

    this._removedId = 0;

    if (this._indicator) {
      for (const item of this._indicator.quickSettingsItems) {
        item.destroy();
      }

      this._indicator.destroy();

      this._indicator = null;
    }
  }
}
