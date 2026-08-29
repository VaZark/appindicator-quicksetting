import Atk from "gi://Atk";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import Meta from "gi://Meta";
import St from "gi://St";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import { DBUS_MENU_IFACE } from "./protocol/interfaces.js";
import { previewStyle, revealAdjustment, SUBMENU_PREVIEW_ITEMS } from "./ui/submenuLayout.js";
import { normalizeIconName, setDbusMenuIconData } from "./utils/iconUtils.js";
import { createSignalManager } from "./utils/lifecycle.js";

const openedSubmenuByParent = new WeakMap();

class DBusPopupSubMenuMenuItem extends PopupMenu.PopupSubMenuMenuItem {
  _subMenuOpenStateChanged(_menu, open) {
    const parent = this.menu._parent;

    if (open) {
      this.add_style_pseudo_class("open");

      const current = openedSubmenuByParent.get(parent);
      if (current && current !== this.menu) current.close(true);
      openedSubmenuByParent.set(parent, this.menu);

      this.add_accessible_state(Atk.StateType.EXPANDED);
      this.add_style_pseudo_class("checked");
      return;
    }

    this.remove_style_pseudo_class("open");
    if (openedSubmenuByParent.get(parent) === this.menu) openedSubmenuByParent.delete(parent);
    this.remove_accessible_state(Atk.StateType.EXPANDED);
    this.remove_style_pseudo_class("checked");
  }
}

export class DBusMenuClient {
  constructor(busName, objectPath) {
    this._busName = busName;
    this._objectPath = objectPath;
    this._destroyed = false;
    this._menu = null;
    this._laterIds = new Set();
    this._signals = createSignalManager();

    this._proxy = Gio.DBusProxy.new_for_bus_sync(
      Gio.BusType.SESSION,
      Gio.DBusProxyFlags.DO_NOT_LOAD_PROPERTIES,
      null,
      busName,
      objectPath,
      DBUS_MENU_IFACE,
      null,
    );

    this._signals.connect(this._proxy, "g-signal", (_proxy, _sender, signal, _params) => {
      if (signal === "LayoutUpdated" || signal === "ItemsPropertiesUpdated") {
        this.reload();
      }
    });
  }

  attachToMenu(menu) {
    this._menu = menu;
    this._signals.connect(menu, "open-state-changed", (_menu, open) => {
      if (!open) return;

      this._prepareAndReload(0);
    });

    this._prepareAndReload(0);
  }

  _prepareAndReload(id) {
    this.aboutToShow(id);
    this.reload();
  }

  async reload() {
    if (this._destroyed || !this._menu) return;

    try {
      const result = await Gio.DBus.session.call(
        this._busName,
        this._objectPath,
        DBUS_MENU_IFACE,
        "GetLayout",
        new GLib.Variant("(iias)", [0, -1, []]),
        null,
        Gio.DBusCallFlags.NONE,
        3000,
        null,
      );

      if (this._destroyed || !this._menu) return;

      const unpacked = result.deep_unpack();
      const layout = normalizeVariant(unpacked[1]);
      this._render(layout);
    } catch (e) {
      if (e.matches?.(Gio.DBusError, Gio.DBusError.UNKNOWN_METHOD)) return;
      logError(e, `Unable to load DBusMenu ${this._busName}${this._objectPath}`);
    }
  }

  _render(root) {
    if (!root || !this._menu) return;

    this._menu.removeAll();
    const [_rootId, _rootProperties, children] = root;
    for (const child of children ?? []) {
      const item = this._createMenuItem(normalizeVariant(child));
      if (item) this._menu.addMenuItem(item);
    }

    this._setSubmenuPreviewHeight(this._menu);
  }

  _createMenuItem(node) {
    if (!node) return null;

    const [id, properties, children] = node;
    const props = normalizeProperties(properties);
    if (props.visible === false) return null;
    if (props.type === "separator") return new PopupMenu.PopupSeparatorMenuItem();

    const childNodes = (children ?? []).map(normalizeVariant);
    const hasSubmenu = props["children-display"] === "submenu" || childNodes.length > 0;
    const item = this._createStandardItem(props, hasSubmenu);

    this._applyItemState(item, props);
    this._applyIcon(item, props);

    if (hasSubmenu) this._populateSubmenu(item, id, childNodes);
    if (item instanceof PopupMenu.PopupMenuItem) this._connectItemActivation(item, id);

    return item;
  }

  _createStandardItem(props, hasSubmenu) {
    const label = cleanLabel(props.label ?? "");
    return hasSubmenu
      ? new DBusPopupSubMenuMenuItem(label)
      : new PopupMenu.PopupMenuItem(label);
  }

  _applyItemState(item, props) {
    item.setSensitive(props.enabled !== false);

    if (props["toggle-type"] === "checkmark" && props["toggle-state"] > 0) {
      item.setOrnament(PopupMenu.Ornament.CHECK);
    } else if (props["toggle-type"] === "radio" && props["toggle-state"] > 0) {
      item.setOrnament(PopupMenu.Ornament.DOT);
    }
  }

  _populateSubmenu(item, id, childNodes) {
    item.menu.actor.add_style_class_name("running-app-submenu");

    for (const child of childNodes) {
      const childItem = this._createMenuItem(child);
      if (childItem) item.menu.addMenuItem(childItem);
    }

    this._setSubmenuPreviewHeight(item.menu);
    item.menu.connect("open-state-changed", (_menu, open) => {
      if (open) this._openSubmenu(id, item.menu);
    });
  }

  _connectItemActivation(item, id) {
    item.connect("activate", (_item, event) => {
      const timestamp = event?.get_time?.() ?? 0;
      this.event(id, "clicked", new GLib.Variant("i", 0), timestamp);
    });
  }

  _openSubmenu(id, menu) {
    this.event(id, "opened");
    this.aboutToShow(id);
    this._revealSubmenuPreview(menu);
  }

  _setSubmenuPreviewHeight(menu) {
    const children = menu.box.get_children().filter((child) => child.visible);
    const heights = children.map((child) => child.get_preferred_height(-1)[1]);
    menu.actor.style = previewStyle(menu.actor.style, heights);
  }

  _revealSubmenuPreview(menu) {
    const laters = global.compositor.get_laters();
    const laterId = laters.add(Meta.LaterType.BEFORE_REDRAW, () => {
      this._laterIds.delete(laterId);
      this._revealAllocatedSubmenu(menu);
      return GLib.SOURCE_REMOVE;
    });
    this._laterIds.add(laterId);
  }

  _revealAllocatedSubmenu(menu) {
    if (this._destroyed || !menu.isOpen) return;

    const scrollView = menu._parent?.actor;
    const adjustment = scrollView?.get_vadjustment?.();
    const children = menu.box.get_children().filter((child) => child.visible);
    const lastPreviewItem = children[Math.min(children.length, SUBMENU_PREVIEW_ITEMS) - 1];

    if (!adjustment || !lastPreviewItem || adjustment.page_size <= 0) return;

    const [, menuY] = menu.actor.get_transformed_position();
    const [, itemY] = lastPreviewItem.get_transformed_position();
    const [, itemHeight] = lastPreviewItem.get_transformed_size();
    const [, scrollY] = scrollView.get_transformed_position();
    const targetTop = adjustment.value + menuY - scrollY;
    const targetBottom = adjustment.value + itemY + itemHeight - scrollY;

    adjustment.value = revealAdjustment(
      adjustment.value,
      adjustment.page_size,
      adjustment.upper,
      targetTop,
      targetBottom,
    );
  }

  _applyIcon(item, props) {
    const iconName = props["icon-name"];
    const iconData = props["icon-data"];
    if (!iconName && !iconData) return;

    const icon = new St.Icon({ iconSize: 20, styleClass: "popup-menu-icon" });
    if (item.label) item.label.x_expand = true;
    item.insert_child_at_index(icon, 1);

    if (iconName) {
      icon.iconName = normalizeIconName(iconName);
      return;
    }

    setDbusMenuIconData(icon, iconData, 20).catch((e) => logError(e, "Unable to render DBusMenu icon"));
  }

  event(id, eventName, data = null, timestamp = 0) {
    if (this._destroyed) return;

    data ??= new GLib.Variant("i", 0);
    Gio.DBus.session.call(
      this._busName,
      this._objectPath,
      DBUS_MENU_IFACE,
      "Event",
      new GLib.Variant("(isvu)", [id, eventName, data, timestamp]),
      null,
      Gio.DBusCallFlags.NONE,
      2000,
      null,
      (_connection, result) => {
        try {
          Gio.DBus.session.call_finish(result);
        } catch (e) {
          logError(e, "DBusMenu.Event");
        }
      },
    );
  }

  async aboutToShow(id) {
    if (this._destroyed) return;

    try {
      const result = await Gio.DBus.session.call(
        this._busName,
        this._objectPath,
        DBUS_MENU_IFACE,
        "AboutToShow",
        new GLib.Variant("(i)"),
        null,
        Gio.DBusCallFlags.NONE,
        1000,
        null,
      );

      if (!result) return;
      if (result.is_of_type(new GLib.VariantType("(b)"))) {
        const [changed] = result.deep_unpack();
        if (changed) this.reload();
      }
    } catch (e) {
      if (
        e.matches?.(Gio.DBusError, Gio.DBusError.UNKNOWN_METHOD) ||
        e.matches?.(Gio.DBusError, Gio.DBusError.FAILED)
      ) return;
      logError(e, "DBusMenu.AboutToShow");
    }
  }

  destroy() {
    if (this._destroyed) return;

    this._destroyed = true;
    const laters = global.compositor.get_laters();
    for (const id of this._laterIds) laters.remove(id);
    this._laterIds.clear();
    this._signals.reset();
    this._proxy = null;
    this._menu = null;
  }
}

function normalizeVariant(value) {
  while (value instanceof GLib.Variant) value = value.deep_unpack();
  if (Array.isArray(value)) return value.map(normalizeVariant);
  return value;
}

function normalizeProperties(values) {
  const result = {};
  for (const [name, value] of Object.entries(values ?? {})) result[name] = normalizeVariant(value);
  return result;
}

function cleanLabel(label) {
  return label.replace(/_([^_])/g, "$1");
}
