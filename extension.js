import * as Main from "resource:///org/gnome/shell/ui/main.js";

import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

import { ExtensionController } from "./src/extensionController.js";

import { StatusNotifierWatcher } from "./src/statusNotifierWatcher.js";

import { RunningAppsWidget } from "./src/runningAppsWidget.js";

export default class AppIndicatorQuickSettingsExtension extends Extension {
  enable() {
    this._controller = new ExtensionController({
      createWidget: () => new RunningAppsWidget(),
      createWatcher: () => new StatusNotifierWatcher(),
      // This is a full-width Quick Settings widget, like Background Apps.
      addWidget: (widget) => Main.panel.statusArea.quickSettings.menu.addItem(widget, 2),
    });
    this._controller.enable();
  }

  disable() {
    this._controller?.disable();
    this._controller = null;
  }
}
