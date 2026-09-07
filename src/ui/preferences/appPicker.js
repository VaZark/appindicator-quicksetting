import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import {
  ACTIVE_APPS_KEY,
  readAppOverrides,
  getAppOverride,
  getAppOverrideName,
  hasAppOverride,
} from "../../utils/appOverrides.js";
import { gettext as _ } from "../../utils/translations.js";

export class AppPicker {
  constructor(parent, settings, { type, title }, onSelect, onClose) {
    this.settings = settings;
    this.type = type;
    this.onSelect = onSelect;
    this.window = new Adw.Window({
      title: _("add_override_group").format(title),
      transientFor: parent,
      modal: true,
      destroyWithParent: true,
      defaultWidth: 420,
      defaultHeight: 440,
    });
    this.list = new Gtk.ListBox({ selectionMode: Gtk.SelectionMode.NONE });
    this.list.add_css_class("boxed-list");
    const scroll = new Gtk.ScrolledWindow({ vexpand: true, child: this.list });
    scroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
    const content = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
    content.append(new Adw.HeaderBar());
    content.append(scroll);
    this.window.set_content(content);
    this.window.connect("close-request", () => {
      onClose();
      return false;
    });
    this.refresh();
  }

  present() {
    this.window.present();
  }

  close() {
    this.window.close();
  }

  refresh() {
    let child;
    while ((child = this.list.get_first_child())) this.list.remove(child);
    const records = readAppOverrides(this.settings);
    const ids = [...new Set(this.settings.get_strv(ACTIVE_APPS_KEY))];
    ids.sort((a, b) =>
      getAppOverrideName(records, a).localeCompare(getAppOverrideName(records, b)),
    );
    if (!ids.length) {
      this.list.append(
        new Adw.ActionRow({
          title: _("no_active_apps"),
          subtitle: _("no_active_apps_description"),
        }),
      );
    }
    for (const id of ids) this.list.append(this.createAppRow(records, id));
  }

  createAppRow(records, id) {
    const existing = hasAppOverride(getAppOverride(records, id), this.type);
    const row = new Adw.ActionRow({
      title: getAppOverrideName(records, id),
      subtitle: existing ? _("override_already_exists").format(id) : id,
      useMarkup: false,
      activatable: true,
    });
    row.connect("activated", () => this.onSelect(id));
    return row;
  }
}
