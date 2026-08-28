import GObject from "gi://GObject";
import St from "gi://St";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import { SNIStatus } from "../protocol/statusNotifierItem.js";
import { getIndicatorName } from "../utils/appNames.js";
import { setSniIcon } from "../utils/iconUtils.js";
import { DBusMenuClient } from "../dbusMenu.js";

export const RunningAppItem = GObject.registerClass(
  class RunningAppItem extends PopupMenu.PopupSubMenuMenuItem {
    _init(indicator) {
      super._init(getIndicatorName(indicator));

      this._indicator = indicator;
      this._dbusMenu = null;
      this._signals = [];

      this._icon = new St.Icon({
        iconName: "application-x-executable-symbolic",
        iconSize: 20,
        styleClass: "popup-menu-icon",
      });

      this.insert_child_at_index(this._icon, 1);

      this._signals.push(indicator.connect("changed", () => this._sync()));
      this._signals.push(indicator.connect("status-changed", () => this._sync()));
      this._signals.push(indicator.connect("icon-changed", () => this._syncIcon()));
      this._signals.push(indicator.connect("menu-changed", () => this._setupMenu()));
      this._sync();
      this._setupMenu();
    }

    _sync() {
      this.label.text = getIndicatorName(this._indicator);
      this.visible = this._indicator.status !== SNIStatus.PASSIVE;
      this._syncIcon();
    }

    _syncIcon() {
      const attention = this._indicator.status === SNIStatus.NEEDS_ATTENTION;
      const name = attention ? this._indicator.attentionIconName : this._indicator.iconName;
      const pixmaps = attention ? this._indicator.attentionIconPixmap : this._indicator.iconPixmap;
      const success = setSniIcon(
        this._icon,
        { name, themePath: this._indicator.iconThemePath, pixmaps },
        20,
      );

      if (success) return;

      this._icon.content = null;
      this._icon.gicon = null;
      this._icon.iconName = "application-x-executable-symbolic";
      this._icon.width = -1;
      this._icon.height = -1;
    }

    _setupMenu() {
      this._destroyDbusMenu();
      this.menu.removeAll();

      const path = this._indicator.menuPath;
      if (!path) return;

      try {
        this._dbusMenu = new DBusMenuClient(this._indicator.busName, path);
        this._dbusMenu.attachToMenu(this.menu);
      } catch (e) {
        logError(e, `Unable to attach DBusMenu for ${this._indicator.id}`);
      }
    }

    _destroyDbusMenu() {
      this._dbusMenu?.destroy();
      this._dbusMenu = null;
    }

    destroy() {
      this._destroyDbusMenu();

      for (const id of this._signals) {
        try {
          this._indicator?.disconnect(id);
        } catch {
          // Indicator may already be destroyed.
        }
      }

      this._signals = [];
      this._indicator = null;
      super.destroy();
    }
  },
);
