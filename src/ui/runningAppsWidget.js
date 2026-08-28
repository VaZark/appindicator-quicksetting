import GObject from "gi://GObject";
import { gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";
import { QuickToggle } from "resource:///org/gnome/shell/ui/quickSettings.js";
import { IndicatorItems } from "./indicatorItems.js";
import { RunningAppItem } from "./runningAppItem.js";
import { setOpenedSubMenu } from "./submenuState.js";

export const RunningAppsWidget = GObject.registerClass(
  class RunningAppsWidget extends QuickToggle {
    _init() {
      super._init({ hasMenu: true, iconName: "go-next-symbolic" });
      this.menu.actor.style = "max-height: 600px;";
      this.title = _("Running Apps");

      // Use the same presentation as GNOME's Background Apps control.
      this.add_style_class_name("background-apps-quick-toggle");
      this._box.set_child_above_sibling(this._icon, null);

      this.menu.setHeader("preferences-desktop-multitasking-symbolic", _("Running Apps"));

      this._items = new IndicatorItems(
        (indicator) => new RunningAppItem(indicator),
        (item) => this.menu.addMenuItem(item),
      );
      this.visible = false;

      /*
       * GNOME normally assumes one submenu level:
       *
       * root
       *   -> submenu
       *
       * We have:
       *
       * root
       *   -> RunningAppItem.menu
       *      -> DBusMenu submenu
       *
       * Opening the DBusMenu submenu must not close
       * RunningAppItem.menu.
       */
      this._originalSetOpenedSubMenu = this.menu._setOpenedSubMenu;

      this.menu._setOpenedSubMenu = (submenu) => {
        this._setOpenedSubMenu(submenu);
      };

      this.connect("popup-menu", () => {
        this.menu.open();
      });

      this.connect("destroy", () => this._onDestroy());
    }

    _setOpenedSubMenu(submenu) {
      setOpenedSubMenu(this.menu, submenu);
    }

    addIndicator(indicator) {
      if (this._items.add(indicator)) this._syncVisibility();
    }

    removeIndicator(indicator) {
      if (this._items.remove(indicator)) this._syncVisibility();
    }

    _syncVisibility() {
      this.visible = this._items.size > 0;
    }

    vfunc_clicked() {
      this.menu.open();
    }

    _onDestroy() {
      /*
       * Restore GNOME's original method.
       */
      if (this._originalSetOpenedSubMenu) {
        this.menu._setOpenedSubMenu = this._originalSetOpenedSubMenu;
      }

      this._originalSetOpenedSubMenu = null;

      this._items.destroyAll();
    }
  },
);
