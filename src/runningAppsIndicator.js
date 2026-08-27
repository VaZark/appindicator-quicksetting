import GObject from "gi://GObject";

import { SystemIndicator } from "resource:///org/gnome/shell/ui/quickSettings.js";

import { RunningAppsToggle } from "./runningAppsToggle.js";

export const RunningAppsIndicator = GObject.registerClass(
  class RunningAppsIndicator extends SystemIndicator {
    _init() {
      super._init();

      this._panelIcon = this._addIndicator();

      this._panelIcon.iconName = "preferences-desktop-multitasking-symbolic";

      this._panelIcon.visible = false;

      this._toggle = new RunningAppsToggle();

      this.quickSettingsItems.push(this._toggle);
    }

    addIndicator(indicator) {
      this._toggle.addIndicator(indicator);

      this._syncVisibility();
    }

    removeIndicator(indicator) {
      this._toggle.removeIndicator(indicator);

      this._syncVisibility();
    }

    _syncVisibility() {
      this._panelIcon.visible = this._toggle.itemCount > 0;
    }
  },
);
