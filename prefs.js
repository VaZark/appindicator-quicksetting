import Adw from "gi://Adw";
import GLib from "gi://GLib";
import Gtk from "gi://Gtk";
import {
  ExtensionPreferences,
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import {
  ACTIVE_APPS_KEY,
  APP_OVERRIDES_KEY,
  readAppOverrides,
  updateAppOverride,
  getAppOverride,
  addAppOverride,
} from "./src/utils/appOverrides.js";

export default class AppIndicatorQuickSettingsPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const page = new Adw.PreferencesPage({
      title: _("General"),
      iconName: "preferences-system-symbolic",
    });
    window.add(page);

    const appearanceGroup = new Adw.PreferencesGroup({
      title: _("Appearance"),
      description: _("Configure the Running Apps menu"),
    });
    page.add(appearanceGroup);

    const maxMenuHeight = new Adw.SpinRow({
      title: _("Maximum menu height"),
      subtitle: _("The menu becomes scrollable above this height"),
      adjustment: new Gtk.Adjustment({
        lower: 200,
        upper: 1200,
        stepIncrement: 50,
        pageIncrement: 100,
      }),
    });
    appearanceGroup.add(maxMenuHeight);

    const hidePassiveIndicators = new Adw.SwitchRow({
      title: _("Hide passive indicators"),
      subtitle: _("Only show passive apps when they become active or need attention"),
    });
    appearanceGroup.add(hidePassiveIndicators);

    window._settings = this.getSettings();
    maxMenuHeight.value = window._settings.get_int("max-menu-height");
    maxMenuHeight.connect("notify::value", () => {
      window._settings?.set_int("max-menu-height", Math.round(maxMenuHeight.value));
    });
    window._settings.bind("hide-passive-indicators", hidePassiveIndicators, "active", 0);
    this._addAppPreferences(window);
    window.connect("close-request", () => {
      window._settings = null;
    });
  }
  _addAppPreferences(window) {
    const settings = window._settings;
    const page = new Adw.PreferencesPage({ title: _("Apps"), iconName: "view-app-grid-symbolic" });
    window.add(page);
    const definitions = [
      {
        type: "label",
        title: _("Labels"),
        description: _("Leave a label empty to use the app’s name."),
      },
      {
        type: "order",
        title: _("Ordering"),
        description: _("Lower numbers first. Default: 0. Ties keep registration order."),
      },
      {
        type: "hidden",
        title: _("Hide"),
        description: _("Hide apps even when they need attention."),
      },
    ];
    const groups = new Map();
    const controls = new Map();
    let rows = [];
    let writing = false;
    let refreshId = 0;
    let needsRefresh = false;
    let focusTarget = null;
    let highlightId = 0;
    let highlightedRow = null;
    let picker = null;
    let refreshPicker = null;
    let closed = false;
    const name = (records, id) => {
      const record = getAppOverride(records, id);
      return typeof record.name === "string" && record.name ? record.name : id;
    };
    const clearHighlight = () => {
      if (highlightId) GLib.source_remove(highlightId);
      highlightId = 0;
      highlightedRow?.remove_css_class("accent");
      highlightedRow = null;
    };
    const scheduleRefresh = (rebuild = true) => {
      needsRefresh ||= rebuild;
      if (closed || refreshId) return;
      refreshId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
        refreshId = 0;
        if (needsRefresh) refresh();
        needsRefresh = false;
        if (focusTarget) {
          const [type, id] = focusTarget;
          focusTarget = null;
          const target = controls.get(type)?.get(id);
          if (target) {
            clearHighlight();
            target.control.grab_focus();
            highlightedRow = target.row;
            highlightedRow.add_css_class("accent");
            highlightId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
              highlightId = 0;
              highlightedRow?.remove_css_class("accent");
              highlightedRow = null;
              return GLib.SOURCE_REMOVE;
            });
          }
        }
        return GLib.SOURCE_REMOVE;
      });
    };
    const save = (id, patch, rebuild = false) => {
      writing = true;
      try {
        updateAppOverride(settings, id, patch);
      } finally {
        writing = false;
      }
      if (rebuild) scheduleRefresh();
    };
    const makeButton = (label, callback) => {
      const button = new Gtk.Button({ label, valign: Gtk.Align.CENTER });
      button.connect("clicked", callback);
      return button;
    };
    const openPicker = ({ type, title }) => {
      if (picker) {
        picker.present();
        return;
      }
      picker = new Adw.Window({
        title: _("Add override") + " — " + title,
        transientFor: window,
        modal: true,
        destroyWithParent: true,
        defaultWidth: 420,
        defaultHeight: 440,
      });
      const dialog = picker;
      const content = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
      content.append(new Adw.HeaderBar());
      const list = new Gtk.ListBox({ selectionMode: Gtk.SelectionMode.NONE });
      list.add_css_class("boxed-list");
      const scroll = new Gtk.ScrolledWindow({ vexpand: true, child: list });
      scroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
      content.append(scroll);
      dialog.set_content(content);
      refreshPicker = () => {
        let child;
        while ((child = list.get_first_child())) list.remove(child);
        const records = readAppOverrides(settings);
        const ids = [...new Set(settings.get_strv(ACTIVE_APPS_KEY))];
        ids.sort((a, b) => name(records, a).localeCompare(name(records, b)));
        if (!ids.length)
          list.append(
            new Adw.ActionRow({
              title: _("No active apps"),
              subtitle: _("Start an app with a tray indicator while the extension is enabled."),
            }),
          );
        for (const id of ids) {
          const existing = Object.hasOwn(getAppOverride(records, id), type);
          const row = new Adw.ActionRow({
            title: name(records, id),
            subtitle: existing ? id + " — " + _("Override already exists") : id,
            useMarkup: false,
            activatable: true,
          });
          row.connect("activated", () => {
            // Re-read at selection time: another preferences window may have added it.
            writing = true;
            let added;
            try {
              added = addAppOverride(settings, id, type);
            } finally {
              writing = false;
            }
            dialog.close();
            focusTarget = [type, id];
            scheduleRefresh(added);
          });
          list.append(row);
        }
      };
      dialog.connect("close-request", () => {
        picker = null;
        refreshPicker = null;
        return false;
      });
      refreshPicker();
      dialog.present();
    };
    for (const definition of definitions) {
      const group = new Adw.PreferencesGroup({
        title: definition.title,
        description: definition.description,
      });
      group.set_header_suffix(makeButton(_("Add override"), () => openPicker(definition)));
      page.add(group);
      groups.set(definition.type, group);
    }
    const refresh = () => {
      clearHighlight();
      for (const [group, row] of rows) group.remove(row);
      rows = [];
      controls.clear();
      const records = readAppOverrides(settings);
      const entries = Object.entries(records).sort(([a], [b]) =>
        name(records, a).localeCompare(name(records, b)),
      );
      for (const { type } of definitions) {
        const group = groups.get(type);
        controls.set(type, new Map());
        const add = (row) => {
          group.add(row);
          rows.push([group, row]);
        };
        const overrides = entries.filter(([, record]) => Object.hasOwn(record, type));
        if (!overrides.length)
          add(
            new Adw.ActionRow({
              title: _("No overrides"),
              subtitle: _("Add an override to choose an active app."),
            }),
          );
        for (const [id, record] of overrides) {
          const row = new Adw.ActionRow({
            title: name(records, id),
            subtitle: id,
            useMarkup: false,
          });
          let control;
          if (type === "label") {
            control = new Gtk.Entry({
              text: typeof record.label === "string" ? record.label : "",
              placeholderText: _("Default app name"),
              valign: Gtk.Align.CENTER,
              widthChars: 16,
            });
            const apply = () => save(id, { label: control.text.trim() });
            control.connect("activate", apply);
            row.add_suffix(control);
            row.add_suffix(makeButton(_("Apply"), apply));
          } else if (type === "order") {
            control = new Gtk.SpinButton({
              adjustment: new Gtk.Adjustment({
                lower: -10000,
                upper: 10000,
                stepIncrement: 1,
                pageIncrement: 10,
              }),
              numeric: true,
              valign: Gtk.Align.CENTER,
            });
            control.value = Number.isSafeInteger(record.order) ? record.order : 0;
            control.connect("value-changed", () => save(id, { order: control.get_value_as_int() }));
            row.add_suffix(control);
          } else {
            control = new Gtk.Switch({ active: record.hidden === true, valign: Gtk.Align.CENTER });
            control.connect("notify::active", () => save(id, { hidden: control.active }));
            row.add_suffix(control);
          }
          row.activatable_widget = control;
          row.add_suffix(makeButton(_("Remove"), () => save(id, { [type]: undefined }, true)));
          controls.get(type).set(id, { row, control });
          add(row);
        }
      }
    };
    refresh();
    const changedId = settings.connect(`changed::${APP_OVERRIDES_KEY}`, () => {
      if (!writing) {
        scheduleRefresh();
        refreshPicker?.();
      }
    });
    const activeChangedId = settings.connect(`changed::${ACTIVE_APPS_KEY}`, () =>
      refreshPicker?.(),
    );
    window.connect("close-request", () => {
      closed = true;
      picker?.close();
      if (refreshId) GLib.source_remove(refreshId);
      refreshId = 0;
      clearHighlight();
      settings.disconnect(changedId);
      settings.disconnect(activeChangedId);
    });
  }
}
