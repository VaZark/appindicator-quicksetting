import * as UpstreamDBusMenu from "../vendor/gnome-shell-extension-appindicator/dbusMenu.js";

export class DBusMenuClient {
  constructor(busName, objectPath, indicator) {
    this._client = new UpstreamDBusMenu.Client(busName, objectPath, indicator._indicator);
    this._readyId = 0;
    this._menu = null;
    this._destroyed = false;
  }

  attachToMenu(menu) {
    this._menu = menu;

    if (this._client.isReady) {
      this._client.attachToMenu(menu);
      return;
    }

    this._readyId = this._client.connect("ready-changed", () => {
      if (!this._destroyed && this._client.isReady) this._client.attachToMenu(menu);
    });
  }

  destroy() {
    if (this._destroyed) return;

    this._destroyed = true;

    if (this._readyId) this._client.disconnect(this._readyId);

    this._readyId = 0;
    this._client.destroy();
    this._client = null;
    this._menu = null;
  }
}
