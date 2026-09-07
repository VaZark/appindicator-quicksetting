import Adw from "gi://Adw";
import GLib from "gi://GLib";
import Gtk from "gi://Gtk";
import {
  ACTIVE_APPS_KEY,
  APP_OVERRIDES_KEY,
  readAppOverrides,
  updateAppOverride,
  getAppOverrideName,
  hasAppOverride,
  addAppOverride,
} from "../../utils/appOverrides.js";
import { gettext as _ } from "../../utils/translations.js";
import { AppPicker } from "./appPicker.js";
import { createOverrideRow } from "./overrideRow.js";

function getOverrideGroups() {
  return [
    { type: "label", title: _("labels"), description: _("labels_description") },
    { type: "order", title: _("ordering"), description: _("ordering_description") },
    { type: "hidden", title: _("hide"), description: _("hide_description") },
  ];
}

export class AppPreferences {
  constructor(window, settings) {
    this.window = window;
    this.settings = settings;
    this.groups = new Map();
    this.controls = new Map();
    this.rows = [];
    this.writing = false;
    this.closed = false;
    this.refreshId = 0;
    this.needsRefresh = false;
    this.focusTarget = null;
    this.highlightId = 0;
    this.highlightedRow = null;
    this.picker = null;

    this.addPage();
    this.refreshRows();
    this.connectSettings();
  }

  addPage() {
    const page = new Adw.PreferencesPage({ title: _("apps"), iconName: "view-app-grid-symbolic" });
    this.window.add(page);
    for (const definition of getOverrideGroups()) {
      const group = new Adw.PreferencesGroup({
        title: definition.title,
        description: definition.description,
      });
      const addButton = new Gtk.Button({ label: _("add_override"), valign: Gtk.Align.CENTER });
      addButton.update_property(
        [Gtk.AccessibleProperty.LABEL],
        [_("add_override_group").format(definition.title)],
      );
      addButton.connect("clicked", () => this.openPicker(definition));
      group.set_header_suffix(addButton);
      page.add(group);
      this.groups.set(definition.type, group);
    }
  }

  connectSettings() {
    this.changedId = this.settings.connect(`changed::${APP_OVERRIDES_KEY}`, () => {
      if (this.writing) return;
      this.scheduleRefresh();
      this.picker?.refresh();
    });
    this.activeChangedId = this.settings.connect(`changed::${ACTIVE_APPS_KEY}`, () =>
      this.picker?.refresh(),
    );
  }

  // Local writes update their own row; external writes rebuild the page.
  writeSettings(write) {
    this.writing = true;
    try {
      return write();
    } finally {
      this.writing = false;
    }
  }

  saveOverride(id, patch, rebuild = false) {
    this.writeSettings(() => updateAppOverride(this.settings, id, patch));
    if (rebuild) this.scheduleRefresh();
  }

  openPicker(definition) {
    if (!this.picker) {
      this.picker = new AppPicker(
        this.window,
        this.settings,
        definition,
        (id) => this.addOverrideFromPicker(id, definition.type),
        () => {
          this.picker = null;
        },
      );
    }
    this.picker.present();
  }

  addOverrideFromPicker(id, type) {
    // Re-read at selection time: another preferences window may have added it.
    const added = this.writeSettings(() => addAppOverride(this.settings, id, type));
    this.picker?.close();
    this.focusTarget = { type, id };
    this.scheduleRefresh(added);
  }

  confirmRemoval(id, type, appName) {
    const dialog = new Adw.MessageDialog({
      transientFor: this.window,
      modal: true,
      destroyWithParent: true,
      heading: type === "hidden" ? _("show_app_confirmation") : _("delete_override_confirmation"),
      body:
        type === "hidden"
          ? _("remove_hidden_app_confirmation").format(appName)
          : _("restore_default_confirmation").format(appName),
    });
    dialog.add_response("cancel", _("cancel"));
    dialog.add_response("delete", _("delete"));
    dialog.set_response_appearance("delete", Adw.ResponseAppearance.DESTRUCTIVE);
    dialog.set_default_response("cancel");
    dialog.set_close_response("cancel");
    dialog.connect("response", (_dialog, response) => {
      if (response === "delete" && !this.closed) this.saveOverride(id, { [type]: undefined }, true);
    });
    dialog.present();
  }

  refreshRows() {
    this.clearRows();
    const records = readAppOverrides(this.settings);
    const entries = Object.entries(records).sort(([a], [b]) =>
      getAppOverrideName(records, a).localeCompare(getAppOverrideName(records, b)),
    );
    for (const [type, group] of this.groups) {
      this.controls.set(type, new Map());
      const overrides = entries.filter(([, record]) => hasAppOverride(record, type));
      if (!overrides.length) {
        this.addRow(
          group,
          new Adw.ActionRow({ title: _("no_overrides"), subtitle: _("no_overrides_description") }),
        );
      }
      for (const [id, record] of overrides) this.addOverrideRow(group, type, id, record, records);
    }
  }

  addOverrideRow(group, type, id, record, records) {
    const name = getAppOverrideName(records, id);
    const target = createOverrideRow({
      id,
      name,
      type,
      value: record[type],
      onSave: (value) => this.saveOverride(id, { [type]: value }),
      onRemove: () => this.confirmRemoval(id, type, name),
    });
    this.controls.get(type).set(id, target);
    this.addRow(group, target.row);
  }

  addRow(group, row) {
    group.add(row);
    this.rows.push([group, row]);
  }

  clearRows() {
    this.clearHighlight();
    for (const [group, row] of this.rows) group.remove(row);
    this.rows = [];
    this.controls.clear();
  }

  scheduleRefresh(rebuild = true) {
    this.needsRefresh ||= rebuild;
    if (this.closed || this.refreshId) return;
    this.refreshId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
      this.refreshId = 0;
      if (this.needsRefresh) this.refreshRows();
      this.needsRefresh = false;
      this.focusSelectedOverride();
      return GLib.SOURCE_REMOVE;
    });
  }

  focusSelectedOverride() {
    if (!this.focusTarget) return;
    const { type, id } = this.focusTarget;
    this.focusTarget = null;
    const target = this.controls.get(type)?.get(id);
    if (!target) return;
    this.clearHighlight();
    target.control.grab_focus();
    this.highlightedRow = target.row;
    this.highlightedRow.add_css_class("accent");
    this.highlightId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
      this.highlightId = 0;
      this.clearHighlight();
      return GLib.SOURCE_REMOVE;
    });
  }

  clearHighlight() {
    if (this.highlightId) GLib.source_remove(this.highlightId);
    this.highlightId = 0;
    this.highlightedRow?.remove_css_class("accent");
    this.highlightedRow = null;
  }

  destroy() {
    if (this.closed) return;
    this.closed = true;
    this.picker?.close();
    if (this.refreshId) GLib.source_remove(this.refreshId);
    this.refreshId = 0;
    this.clearHighlight();
    this.settings.disconnect(this.changedId);
    this.settings.disconnect(this.activeChangedId);
  }
}
