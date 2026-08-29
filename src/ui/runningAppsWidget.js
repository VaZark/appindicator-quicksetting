import GObject from "gi://GObject";
import { gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";
import { QuickToggle } from "resource:///org/gnome/shell/ui/quickSettings.js";
import { IndicatorItems } from "./indicatorItems.js";
import { RunningAppItem } from "./runningAppItem.js";
import { setOpenedSubMenu } from "./submenuState.js";

const MAX_MENU_HEIGHT_KEY = "max-menu-height";

export const RunningAppsWidget = GObject.registerClass(
  class RunningAppsWidget extends QuickToggle {
    _init(settings) {
      super._init({ hasMenu: true, iconName: "go-next-symbolic" });

      this._settings = settings;
      this._configureAppearance();
      this._initializeItems();
      this._overrideSubmenuTracking();
      this._connectWidgetSignals();
    }

    _configureAppearance() {
      this._syncMaxMenuHeight();
      this.title = _("Running Apps");

      // Use the same presentation as GNOME's Background Apps control.
      this.add_style_class_name("background-apps-quick-toggle");
      this._box.set_child_above_sibling(this._icon, null);

      this.menu.box.add_style_class_name("running-app-menu");
      this.menu.setHeader("preferences-desktop-multitasking-symbolic", _("Running Apps"));
    }

    _syncMaxMenuHeight() {
      const height = this._settings.get_int(MAX_MENU_HEIGHT_KEY);
      this.menu.actor.style = `max-height: ${height}px;`;
    }

    _initializeItems() {
      this._items = new IndicatorItems(
        (indicator) => new RunningAppItem(indicator, this._settings),
        (item) => this.menu.addMenuItem(item),
      );
      this.visible = false;
    }

    _overrideSubmenuTracking() {
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
    }

    _connectWidgetSignals() {
      this._settingsChangedId = this._settings.connect(`changed::${MAX_MENU_HEIGHT_KEY}`, () =>
        this._syncMaxMenuHeight(),
      );

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
      if (this._settingsChangedId) {
        this._settings.disconnect(this._settingsChangedId);
      }
      this._settingsChangedId = 0;
      this._settings = null;

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
