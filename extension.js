import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { ExtensionController } from "./src/controllers/extensionController.js";
import { ProtocolController } from "./src/protocol/protocolController.js";
import { RunningAppsWidget } from "./src/ui/runningAppsWidget.js";

export default class AppIndicatorQuickSettingsExtension extends Extension {
  enable() {
    this._settings = this.getSettings();

    this._controller = new ExtensionController({
      createWidget: () => new RunningAppsWidget(this._settings),
      createProtocol: () => new ProtocolController(),
      // This is a full-width Quick Settings widget, like Background Apps.
      addWidget: (widget) => Main.panel.statusArea.quickSettings.menu.addItem(widget, 2),
    });
    this._controller.enable();
  }

  disable() {
    this._controller?.disable();
    this._controller = null;
    this._settings = null;
  }
}
