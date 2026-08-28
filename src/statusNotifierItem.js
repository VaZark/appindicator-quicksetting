import * as Signals from "resource:///org/gnome/shell/misc/signals.js";

import * as AppIndicator from "../vendor/gnome-shell-extension-appindicator/appIndicator.js";

export const SNIStatus = AppIndicator.SNIStatus;

export class StatusNotifierItem extends Signals.EventEmitter {
  constructor(indicator) {
    super();

    this._indicator = indicator;
    this.busName = indicator.busName;
    this.service = indicator.uniqueId;
    this._signals = [];

    for (const [signal, forwarded] of [
      ["icon", "icon-changed"],
      ["status", "status-changed"],
      ["menu", "menu-changed"],
      ["label", "changed"],
      ["accessible-name", "changed"],
    ]) {
      this._signals.push(indicator.connect(signal, () => this.emit(forwarded)));
    }

    this._signals.push(indicator.connect("destroy", () => this.destroy()));
  }

  get uniqueId() {
    return this._indicator.uniqueId;
  }

  get id() {
    return this._indicator.id;
  }

  get title() {
    return this._indicator.title;
  }

  get label() {
    return this._indicator.label;
  }

  get status() {
    return this._indicator.status;
  }

  get category() {
    return "ApplicationStatus";
  }

  get iconName() {
    return this._indicator.icon.name;
  }

  get attentionIconName() {
    return this._indicator.attentionIcon.name;
  }

  get iconThemePath() {
    return this._indicator.icon.theme;
  }

  get iconPixmap() {
    return this._indicator.icon.pixmap;
  }

  get attentionIconPixmap() {
    return this._indicator.attentionIcon.pixmap;
  }

  get menuPath() {
    return this._indicator.menuPath;
  }

  get itemIsMenu() {
    return false;
  }

  activate(x = 0, y = 0, timestamp = 0) {
    return this._indicator.open(x, y, timestamp);
  }

  secondaryActivate(x = 0, y = 0, timestamp = 0) {
    return this._indicator.secondaryActivate(timestamp, x, y);
  }

  scroll(delta, orientation) {
    return this._indicator.scroll(
      orientation === "horizontal" ? delta : 0,
      orientation === "vertical" ? delta : 0,
    );
  }

  get supportsActivation() {
    return this._indicator.supportsActivation;
  }

  destroy() {
    if (!this._indicator) return;
    this.emit("destroy");
    this.disconnectAll();
    this._indicator = null;
  }
}
